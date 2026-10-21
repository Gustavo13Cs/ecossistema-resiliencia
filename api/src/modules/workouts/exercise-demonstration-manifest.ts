import type { DemonstrationManifestEntry } from './exercise-demonstration.types';

// Ilustrações conferidas; URLs transcritas do inventário aprovado, sem resolução por nome.
export const DEMONSTRATION_MANIFEST_VERSION = '2026-10-19.1';
export const EXERCISE_DEMONSTRATION_MANIFEST: readonly DemonstrationManifestEntry[] =
  [
    {
      exerciseId: 'cat-chest-01',
      sourceExerciseId: 'exercise-bench-press',
      originalName: 'Bench Press',
      muscleGroup: 'CHEST',
      equipment: 'BARBELL',
      itemRevision: '1',
      instruction:
        'Deite-se no banco reto com os pés apoiados. Segure a barra com as duas mãos, desça-a de forma controlada em direção ao peito e empurre para estender os cotovelos, conforme a amplitude orientada pelo profissional.',
      assets: [
        {
          id: 'workout-guide-bench-press-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bench-press/frame-1.svg',
          alt: 'Ilustração: Pessoa deitada em banco reto, segurando uma barra acima do peito.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bench-press/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0042-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-chest-02',
      sourceExerciseId: 'exercise-dumbbell-bench-press',
      originalName: 'Dumbbell Bench Press',
      muscleGroup: 'CHEST',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Deite-se no banco reto, com um halter em cada mão e pés apoiados. Flexione os cotovelos para baixar os halteres ao lado do peito e empurre-os para cima, com controle.',
      assets: [
        {
          id: 'workout-guide-dumbbell-bench-press-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-bench-press/frame-1.svg',
          alt: 'Ilustração: Pessoa em banco reto com dois halteres acima do peito.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-bench-press/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0055-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-chest-03',
      sourceExerciseId: 'exercise-incline-bench-press',
      originalName: 'Incline Bench Press',
      muscleGroup: 'CHEST',
      equipment: 'BARBELL',
      itemRevision: '1',
      instruction:
        'Apoie o tronco no banco inclinado e mantenha os pés no chão. Segure a barra, baixe-a de forma controlada em direção à parte superior do peito e empurre-a para cima.',
      assets: [
        {
          id: 'workout-guide-incline-bench-press-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/incline-bench-press/frame-1.svg',
          alt: 'Ilustração: Pessoa em banco inclinado segurando uma barra acima do peito.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/incline-bench-press/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0043-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-chest-08',
      sourceExerciseId: 'exercise-dumbbell-fly',
      originalName: 'Dumbbell Fly',
      muscleGroup: 'CHEST',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Deite-se no banco reto com um halter em cada mão. Com cotovelos levemente flexionados, abra os braços lateralmente e depois aproxime os halteres acima do peito. Use a amplitude orientada pelo profissional.',
      assets: [
        {
          id: 'workout-guide-dumbbell-fly-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-fly/frame-1.svg',
          alt: 'Ilustração: Pessoa em banco reto com halteres para crucifixo; braços aproximados acima do peito.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-fly/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0056-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-back-04',
      sourceExerciseId: 'exercise-pull-up',
      originalName: 'Pull-up',
      muscleGroup: 'BACK',
      equipment: 'BODYWEIGHT',
      itemRevision: '1',
      instruction:
        'Segure a barra fixa com pegada pronada, palmas voltadas para a frente. Eleve o corpo flexionando os cotovelos e desça de forma controlada, evitando balanço.',
      assets: [
        {
          id: 'workout-guide-pull-up-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/pull-up/frame-1.svg',
          alt: 'Ilustração: Pessoa vista por trás em barra fixa, com pegada pronada e cotovelos flexionados.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/pull-up/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0087-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-back-09',
      sourceExerciseId: 'exercise-one-arm-dumbbell-row',
      originalName: 'One-Arm Dumbbell Row',
      muscleGroup: 'BACK',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Apoie uma mão e o joelho do mesmo lado em um banco. Com a outra mão, puxe o halter em direção ao quadril e baixe-o com controle, mantendo o tronco estável. Repita do outro lado conforme a prescrição.',
      assets: [
        {
          id: 'workout-guide-one-arm-dumbbell-row-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/one-arm-dumbbell-row/frame-1.svg',
          alt: 'Ilustração: Pessoa com mão e joelho apoiados no banco, realizando remada com um halter.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/one-arm-dumbbell-row/frame-1.svg',
          author: 'Bryl Lim / Workout Guide',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          changes: 'SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-back-10',
      sourceExerciseId: 'exercise-seated-row',
      originalName: 'Seated Cable Row',
      muscleGroup: 'BACK',
      equipment: 'CABLE',
      itemRevision: '1',
      instruction:
        'Sente-se diante da polia baixa, com os pés apoiados. Puxe o cabo em direção ao tronco, levando os cotovelos para trás; retorne com controle sem balançar o tronco.',
      assets: [
        {
          id: 'workout-guide-seated-row-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-row/frame-1.svg',
          alt: 'Ilustração: Pessoa sentada diante de uma polia baixa, puxando o cabo em direção ao tronco.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-row/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0025-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-back-14',
      sourceExerciseId: 'exercise-dumbbell-shrug',
      originalName: 'Dumbbell Shrug',
      muscleGroup: 'BACK',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Em pé, segure um halter em cada mão ao lado do corpo. Eleve os ombros em direção às orelhas e retorne com controle, sem girá-los.',
      assets: [
        {
          id: 'workout-guide-dumbbell-shrug-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-shrug/frame-1.svg',
          alt: 'Ilustração: Pessoa em pé com dois halteres ao lado do corpo para encolhimento dos ombros.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dumbbell-shrug/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0005-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-quads-01',
      sourceExerciseId: 'exercise-squat',
      originalName: 'Squat',
      muscleGroup: 'QUADRICEPS',
      equipment: 'BARBELL',
      itemRevision: '1',
      instruction:
        'Posicione a barra sobre a parte superior das costas, com apoio e carga orientados pelo profissional. Flexione quadris e joelhos para agachar e volte à posição em pé, mantendo os pés apoiados.',
      assets: [
        {
          id: 'workout-guide-squat-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/squat/frame-1.svg',
          alt: 'Ilustração: Pessoa agachada com barra livre apoiada na parte superior das costas.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/squat/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0122-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-quads-02',
      sourceExerciseId: 'exercise-front-squat',
      originalName: 'Front Squat',
      muscleGroup: 'QUADRICEPS',
      equipment: 'BARBELL',
      itemRevision: '1',
      instruction:
        'Apoie a barra à frente dos ombros, mantendo os cotovelos elevados. Flexione quadris e joelhos para agachar e retorne à posição em pé com controle.',
      assets: [
        {
          id: 'workout-guide-front-squat-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-squat/frame-1.svg',
          alt: 'Ilustração: Pessoa agachada com a barra à frente dos ombros, sem guia de máquina.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-squat/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0138-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-hams-05',
      sourceExerciseId: 'exercise-leg-curl',
      originalName: 'Leg Curl',
      muscleGroup: 'HAMSTRINGS',
      equipment: 'MACHINE',
      itemRevision: '1',
      instruction:
        'Deite-se de barriga para baixo na mesa flexora e ajuste o rolo conforme a orientação do profissional. Flexione os joelhos para aproximar os calcanhares e retorne com controle, mantendo o quadril apoiado.',
      assets: [
        {
          id: 'workout-guide-leg-curl-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/leg-curl/frame-1.svg',
          alt: 'Ilustração: Pessoa deitada de barriga para baixo em máquina de flexão dos joelhos.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/leg-curl/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0117-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-hams-06',
      sourceExerciseId: 'exercise-seated-leg-curl',
      originalName: 'Seated Leg Curl',
      muscleGroup: 'HAMSTRINGS',
      equipment: 'MACHINE',
      itemRevision: '1',
      instruction:
        'Sente-se na cadeira flexora com tronco e coxas apoiados e rolos ajustados pelo profissional. Flexione os joelhos contra a resistência e retorne com controle, sem levantar o quadril.',
      assets: [
        {
          id: 'workout-guide-seated-leg-curl-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-leg-curl/frame-1.svg',
          alt: 'Ilustração: Pessoa sentada em cadeira flexora, com rolo apoiado nas pernas.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-leg-curl/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0119-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-shoulders-01',
      sourceExerciseId: 'exercise-seated-dumbbell-press',
      originalName: 'Dumbbell Seated Shoulder Press',
      muscleGroup: 'SHOULDERS',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Sente-se no banco com encosto e pés apoiados, segurando um halter em cada mão. Empurre os halteres acima dos ombros e retorne com controle, mantendo o tronco apoiado.',
      assets: [
        {
          id: 'workout-guide-seated-dumbbell-press-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-dumbbell-press/frame-1.svg',
          alt: 'Ilustração: Pessoa sentada em banco com encosto, segurando dois halteres para desenvolvimento dos ombros.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/seated-dumbbell-press/frame-1.svg',
          author: 'Bryl Lim / Workout Guide',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          changes: 'SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-shoulders-03',
      sourceExerciseId: 'exercise-arnold-press',
      originalName: 'Arnold Press',
      muscleGroup: 'SHOULDERS',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Em pé, mantenha o tronco estável e os halteres à frente dos ombros, com palmas voltadas para o corpo. Eleve os halteres enquanto gira as palmas para a frente; inverta o movimento ao descer. As duas ilustrações mostram posições diferentes da rotação.',
      assets: [
        {
          id: 'workout-guide-arnold-press-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-1.svg',
          alt: 'Ilustração: Pessoa em pé segurando dois halteres em uma das posições do desenvolvimento Arnold.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-1.svg',
          author: 'Bryl Lim / Workout Guide',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          changes: 'SafeMove: sem alterações no arquivo.',
        },
        {
          id: 'workout-guide-arnold-press-frame-3',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-3.svg',
          alt: 'Ilustração: Pessoa em pé segurando dois halteres em uma das posições do desenvolvimento Arnold. Posição complementar da rotação.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/arnold-press/frame-3.svg',
          author: 'Bryl Lim / Workout Guide',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          changes: 'SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-shoulders-05',
      sourceExerciseId: 'exercise-lateral-raise',
      originalName: 'Lateral Raise',
      muscleGroup: 'SHOULDERS',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Em pé, segure um halter em cada mão ao lado do corpo. Eleve os braços lateralmente com cotovelos levemente flexionados e retorne com controle, conforme a amplitude prescrita.',
      assets: [
        {
          id: 'workout-guide-lateral-raise-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/lateral-raise/frame-1.svg',
          alt: 'Ilustração: Pessoa com dois halteres em elevação lateral dos braços.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/lateral-raise/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0018-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-shoulders-08',
      sourceExerciseId: 'exercise-front-raise',
      originalName: 'Front Raise',
      muscleGroup: 'SHOULDERS',
      equipment: 'DUMBBELL',
      itemRevision: '1',
      instruction:
        'Em pé, segure dois halteres à frente do corpo. Eleve um braço à frente, mantendo o cotovelo levemente flexionado, e baixe com controle. Alterne os lados conforme a prescrição.',
      assets: [
        {
          id: 'workout-guide-front-raise-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-raise/frame-1.svg',
          alt: 'Ilustração: Pessoa realizando elevação frontal alternada com dois halteres.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/front-raise/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0033-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-core-01',
      sourceExerciseId: 'exercise-plank',
      originalName: 'Plank',
      muscleGroup: 'CORE',
      equipment: 'BODYWEIGHT',
      itemRevision: '1',
      instruction:
        'Apoie antebraços e pontas dos pés no chão. Mantenha o corpo alinhado, com abdômen ativo, durante o tempo prescrito e sem prender a respiração. A ilustração mostra uma posição estática.',
      assets: [
        {
          id: 'workout-guide-plank-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/plank/frame-1.svg',
          alt: 'Ilustração: Pessoa em prancha ventral apoiada nos antebraços e pontas dos pés, com joelhos estendidos.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/plank/frame-1.svg',
          author: 'Bryl Lim / Workout Guide',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          changes: 'SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-core-02',
      sourceExerciseId: 'exercise-side-plank',
      originalName: 'Side Plank',
      muscleGroup: 'CORE',
      equipment: 'BODYWEIGHT',
      itemRevision: '1',
      instruction:
        'De lado, apoie o antebraço no chão e mantenha as pernas estendidas. Eleve o quadril para alinhar o corpo e sustente pelo tempo prescrito. Repita do outro lado conforme a orientação profissional.',
      assets: [
        {
          id: 'workout-guide-side-plank-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/side-plank/frame-1.svg',
          alt: 'Ilustração: Pessoa em prancha lateral, apoiada em um antebraço e nos pés, com pernas estendidas.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/side-plank/frame-1.svg',
          author:
            'Bryl Lim / Workout Guide; pose original: Everkinetic (Greg Priday)',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          upstreamSourcePageUrl:
            'https://github.com/everkinetic/data/blob/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6/dist/svg/0113-tension.svg',
          changes:
            'Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced. SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-core-10',
      sourceExerciseId: 'exercise-dead-bug',
      originalName: 'Dead Bug',
      muscleGroup: 'CORE',
      equipment: 'BODYWEIGHT',
      itemRevision: '1',
      instruction:
        'Deite-se de costas e eleve braços e pernas. Estenda lentamente um braço e a perna oposta, mantendo o tronco estável; retorne e alterne os lados conforme a prescrição.',
      assets: [
        {
          id: 'workout-guide-dead-bug-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg',
          alt: 'Ilustração: Pessoa deitada de costas, com braço e perna opostos estendidos no exercício dead bug.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg',
          author: 'Bryl Lim / Workout Guide',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          changes: 'SafeMove: sem alterações no arquivo.',
        },
      ],
    },
    {
      exerciseId: 'cat-core-11',
      sourceExerciseId: 'exercise-bird-dog',
      originalName: 'Bird Dog',
      muscleGroup: 'CORE',
      equipment: 'BODYWEIGHT',
      itemRevision: '1',
      instruction:
        'Em quatro apoios, estenda um braço e a perna oposta sem girar o tronco. Retorne com controle e alterne os lados conforme a prescrição.',
      assets: [
        {
          id: 'workout-guide-bird-dog-frame-1',
          type: 'IMAGE',
          url: 'https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bird-dog/frame-1.svg',
          alt: 'Ilustração: Pessoa em quatro apoios, estendendo um braço e a perna oposta no exercício perdigueiro.',
          sourcePageUrl:
            'https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bird-dog/frame-1.svg',
          author: 'Bryl Lim / Workout Guide',
          licenseName: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          changes: 'SafeMove: sem alterações no arquivo.',
        },
      ],
    },
  ];
