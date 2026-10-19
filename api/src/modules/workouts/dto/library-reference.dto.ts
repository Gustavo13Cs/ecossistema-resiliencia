import {
  IsIn,
  IsString,
  MaxLength,
  ValidateIf,
  Matches,
  ValidateBy,
  isUUID,
} from 'class-validator';
import { LibraryReference } from '../exercise-demonstration.types';

export class LibraryReferenceDto implements LibraryReference {
  @IsIn(['CATALOG', 'CUSTOM'])
  source!: 'CATALOG' | 'CUSTOM';

  @IsString()
  @MaxLength(100)
  @ValidateBy({
    name: 'libraryExerciseId',
    validator: {
      validate(value: unknown, args) {
        const reference = args?.object as LibraryReferenceDto;
        return (
          typeof value === 'string' &&
          (reference.source === 'CUSTOM'
            ? isUUID(value)
            : /^cat-[a-z]+-[0-9]{2}$/.test(value))
        );
      },
    },
  })
  exerciseId!: string;

  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @Matches(/^[A-Za-z0-9.:-]+$/)
  @MaxLength(100)
  demonstrationRevision!: string | null;
}
