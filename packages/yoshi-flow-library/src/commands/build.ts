import path from 'path';
import arg from 'arg';
import bfj from 'bfj';
import { runWebpack } from 'yoshi-common/build/webpack-utils';
import {
  printClientBuildResult,
  printBundleSizeSuggestion,
} from 'yoshi-common/build/print-build-results';
import {
  BUILD_DIR,
  TARGET_DIR,
  STATS_FILE,
  STATICS_DIR,
} from 'yoshi-config/build/paths';
import { inTeamCity } from 'yoshi-helpers/build/queries';
import fs from 'fs-extra';
import TscProcess, {
  TypeError,
} from 'yoshi-common/build/typescript/tsc-process';
import runBabel from 'yoshi-common/build/typescript/runBabel';
import { createClientWebpackConfig } from '../webpack.config';
import { cliCommand } from '../cli';

const join = (...dirs: Array<string>) => path.join(process.cwd(), ...dirs);

const build: cliCommand = async function(argv, config) {
  const args = arg(
    {
      // Types
      '--help': Boolean,
      '--analyze': Boolean,
      '--stats': Boolean,
      '--source-map': Boolean,

      // Aliases
      '-h': '--help',
    },
    { argv },
  );

  const {
    '--help': help,
    '--analyze': isAnalyze,
    '--stats': shouldEmitWebpackStats,
    '--source-map': forceEmitSourceMaps,
  } = args;

  if (help) {
    console.log(
      `
      Description
        Prepare the library for production deployment/publish

      Usage
        $ yoshi-library build

      Options
        --help, -h      Displays this message
        --analyze       Run webpack-bundle-analyzer
        --stats         Emit webpack's stats file on "target/webpack-stats.json"
        --source-map    Emit bundle source maps
    `,
    );

    process.exit(0);
  }

  await Promise.all([
    fs.emptyDir(join(BUILD_DIR)),
    fs.emptyDir(join(TARGET_DIR)),
  ]);

  if (inTeamCity()) {
    const wixMavenStatics = await import('yoshi-common/build/maven-statics');

    await Promise.all([
      wixMavenStatics.default({
        staticsDir: STATICS_DIR,
      }),
    ]);
  }

  try {
    // builds the ES directory
    const tscProcess = new TscProcess({
      outDir: path.join(BUILD_DIR, 'es'),
      rootDir: 'src',
    });

    await tscProcess.build();

    console.log('');
    console.log('Found 0 type errors.');
    console.log('');
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('TypeScript failed with the following Type errors:');
      console.error();
      console.error(error.message);
      process.exit(2);
    }

    throw error;
  }

  // builds the cjs bundle without typecheck
  runBabel({ outDir: path.join(BUILD_DIR, 'cjs'), rootDir: 'src' });

  if (config.bundle) {
    const clientDebugConfig = createClientWebpackConfig(config, {
      isDev: true,
      forceEmitSourceMaps,
    });

    const clientOptimizedConfig = createClientWebpackConfig(config, {
      isAnalyze,
      forceEmitSourceMaps,
    });

    const { stats } = await runWebpack([
      clientDebugConfig,
      clientOptimizedConfig,
    ]);

    const [, clientOptimizedStats] = stats;

    if (shouldEmitWebpackStats) {
      const statsFilePath = join(STATS_FILE);

      fs.ensureDirSync(path.dirname(statsFilePath));
      await bfj.write(statsFilePath, clientOptimizedStats.toJson());
    }

    printClientBuildResult(clientOptimizedStats);
    printBundleSizeSuggestion();
  }
};

export default build;
