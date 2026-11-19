import { labExamSummaryQuery } from './lab-exam-summary';
import { Prisma } from '@prisma/client';
import { PageQueryDto } from '../../common/pagination/page-query.dto';
import {
  pageWindow,
  paginationMeta,
  literalLike,
} from '../../common/pagination/pagination';
import {
  ListLabExamsQueryDto,
  LabLongitudinalQueryDto,
} from './dto/list-lab-exams-query.dto';
import { examWhere } from './lab-exam-filters';
import {
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateLabExamDto } from './dto/create-lab-exam.dto';

@Injectable()
export class LabExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async findAll(user: AuthUser) {
    this.assertNutritionist(user);
    return this.prisma.labExam.findMany({
      where: { creatorId: user.sub, client: { professionalId: user.sub } },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: 25,
      skip: 0,
      include: { markers: true, client: { select: { id: true, name: true } } },
    });
  }

  async findPage(user: AuthUser, query: ListLabExamsQueryDto) {
    this.assertNutritionist(user);
    if (query.clientId)
      await this.clientAccess.getOwnedClient(user, query.clientId);
    const { skip, take } = pageWindow(query);
    const where = examWhere(user.sub, query);
    const filtered = Boolean(
      query.q?.trim() ||
      query.clientId ||
      (query.status && query.status !== 'ALL') ||
      (query.category && query.category !== 'ALL'),
    );
    const [stats] = await this.prisma.$queryRaw<
      {
        ids: string[];
        total: number;
        clients: number;
        altered: number;
        orders: number;
        names: string[];
      }[]
    >(labExamSummaryQuery(user.sub, query));
    // Reutiliza os IDs do agregado sem varrer novamente todos os laudos na página sem filtros.
    const [items, total] = await Promise.all([
      this.prisma.labExam.findMany({
        where: filtered ? where : { ...where, id: { in: stats.ids } },
        skip: filtered ? skip : 0,
        take,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        include: {
          markers: true,
          client: { select: { id: true, name: true } },
        },
      }),
      filtered
        ? this.prisma.labExam.count({ where })
        : Promise.resolve(stats.total),
    ]);
    return {
      items,
      pagination: paginationMeta(total, query),
      summary: {
        totalExams: stats.total,
        clientsWithExamsCount: stats.clients,
        alteredMarkersCount: stats.altered,
        ordersIssuedCount: stats.orders,
      },
      markerNames: stats.names,
    };
  }

  async findClientPage(user: AuthUser, clientId: string, query: PageQueryDto) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    const { skip, take } = pageWindow(query);
    const where = { clientId, creatorId: user.sub };
    const [items, total] = await Promise.all([
      this.prisma.labExam.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        include: { markers: true },
      }),
      this.prisma.labExam.count({ where }),
    ]);
    return { items, pagination: paginationMeta(total, query) };
  }

  async longitudinal(user: AuthUser, query: LabLongitudinalQueryDto) {
    this.assertNutritionist(user);
    if (query.clientId)
      await this.clientAccess.getOwnedClient(user, query.clientId);
    const { skip, take } = pageWindow(query);
    const where: Prisma.LabExamWhereInput = {
      creatorId: user.sub,
      client: { professionalId: user.sub },
      ...(query.clientId ? { clientId: query.clientId } : {}),
      markers: {
        some: {
          name: { equals: literalLike(query.markerName), mode: 'insensitive' },
        },
      },
    };
    const [exams, total] = await Promise.all([
      this.prisma.labExam.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          clientId: true,
          date: true,
          client: { select: { name: true } },
          markers: {
            where: {
              name: {
                equals: literalLike(query.markerName),
                mode: 'insensitive',
              },
            },
            select: { name: true, value: true, unit: true },
          },
        },
      }),
      this.prisma.labExam.count({ where }),
    ]);
    const items = exams.map((exam) => {
      if (!exam.client || !exam.clientId || !exam.markers[0])
        throw new InternalServerErrorException('Série clínica inconsistente');
      return {
        id: exam.id,
        clientId: exam.clientId,
        clientName: exam.client.name,
        date: exam.date,
        ...exam.markers[0],
      };
    });
    return { items, pagination: paginationMeta(total, query) };
  }

  async remove(user: AuthUser, id: string) {
    this.assertNutritionist(user);
    const metadata = await this.prisma.labExam.findFirst({
      where: { id, creatorId: user.sub },
      select: { clientId: true },
    });
    if (!metadata?.clientId)
      throw new NotFoundException('Exame não encontrado');
    await this.clientAccess.getOwnedClient(user, metadata.clientId);
    const { count } = await this.prisma.labExam.deleteMany({
      where: { id, creatorId: user.sub, clientId: metadata.clientId },
    });
    if (!count) throw new NotFoundException('Exame não encontrado');
    return { deleted: true };
  }

  async create(user: AuthUser, data: CreateLabExamDto) {
    this.assertNutritionist(user);
    const client = await this.clientAccess.getOwnedClient(user, data.clientId);
    return this.prisma.labExam.create({
      data: {
        date: new Date(data.date),
        notes: data.notes,
        clientId: client.id,
        patientId: null,
        creatorId: user.sub,
        markers: {
          create: data.markers.map((marker) => ({
            name: marker.name,
            value: marker.value,
            unit: marker.unit,
          })),
        },
      },
      include: { markers: true, client: { select: { id: true, name: true } } },
    });
  }

  async findByClient(user: AuthUser, clientId: string) {
    this.assertNutritionist(user);
    await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.labExam.findMany({
      where: { clientId, creatorId: user.sub },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      take: 25,
      skip: 0,
      include: { markers: true },
    });
  }

  private assertNutritionist(user: AuthUser) {
    if (user.role !== 'NUTRITIONIST')
      throw new ForbiddenException('Acesso permitido somente a nutricionista');
  }
}
