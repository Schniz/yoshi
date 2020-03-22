import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as babel from '@babel/core';
import globby from 'globby';
import fs from 'fs-extra';
import * as chokidar from 'chokidar';
import copyFilesSync from './copy-files';

const stripExtension = (filePath: string) => {
  return filePath.replace(path.extname(filePath), '');
};

function transpileFile({
  filePath,
  rootDir,
  outDir,
  cwd,
}: {
  filePath: string;
  rootDir: string;
  outDir: string;
  cwd: string;
}) {
  const abosoluteFilePath = path.join(cwd, rootDir, filePath);

  const filePathInBuildDir = path.join(cwd, outDir, filePath);

  const content = fs.readFileSync(abosoluteFilePath, 'utf-8');

  const relativeSourceFileName = path.relative(
    path.dirname(filePathInBuildDir),
    abosoluteFilePath,
  );

  const transpiledContent = babel.transform(content, {
    filename: filePathInBuildDir,
    sourceFileName: relativeSourceFileName,
    sourceMaps: true,
    plugins: ['@babel/plugin-transform-typescript'],
    presets: [['babel-preset-yoshi', { mode: 'test' }]],
  });

  const filePathInBuildDirNoExtensions = stripExtension(filePathInBuildDir);
  const mapFilePath = `${filePathInBuildDirNoExtensions}.js.map`;

  fs.outputFileSync(mapFilePath, JSON.stringify(transpiledContent?.map));

  const sourceMappingURLComment = `\n//# sourceMappingURL=${path.basename(
    mapFilePath,
  )}`;

  fs.outputFileSync(
    `${filePathInBuildDirNoExtensions}.js`,
    transpiledContent?.code + sourceMappingURLComment,
  );
}

export default ({
  watch = false,
  copyFiles = true,
  outDir,
  rootDir,
  cwd = process.cwd(),
}: {
  watch?: boolean;
  copyFiles?: boolean;
  outDir: string;
  rootDir: string;
  cwd?: string;
}) => {
  const tsFilesGlobPattern = ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.json'];
  const absoluteRootDir = path.join(cwd, rootDir);

  const tsFiles = globby.sync(tsFilesGlobPattern, {
    cwd: absoluteRootDir,
  });

  const _transpileFile = (filePath: string) =>
    transpileFile({ filePath, rootDir, outDir, cwd });

  tsFiles.forEach(_transpileFile);

  if (copyFiles) {
    copyFilesSync({ watch, outDir, rootDir, cwd });
  }

  if (watch) {
    const watcher = chokidar.watch(tsFilesGlobPattern, {
      cwd: absoluteRootDir,
      ignoreInitial: true,
    });

    watcher.on('add', _transpileFile).on('change', _transpileFile);
  }
};
