import path from 'path';
import globby from 'globby';
import fs from 'fs-extra';
import * as chokidar from 'chokidar';

export default ({
  watch = false,
  cwd,
  outDir,
  rootDir,
}: {
  watch?: boolean;
  cwd: string;
  outDir: string;
  rootDir: string;
}) => {
  function getBuildAssetPath(assetPath: string) {
    const absolutOutDirPath = path.join(cwd, outDir);
    return path.join(absolutOutDirPath, path.relative(rootDir, assetPath));
  }

  function removeFromOutDir(assetPath: string) {
    const buildAssetPath = getBuildAssetPath(assetPath);

    fs.removeSync(buildAssetPath);
  }

  function copyToOutDir(assetPath: string) {
    const originAssetPath = path.join(cwd, assetPath);
    const buildAssetPath = getBuildAssetPath(assetPath);

    fs.ensureDirSync(path.dirname(buildAssetPath));
    fs.copyFileSync(originAssetPath, buildAssetPath);
  }

  const filesGlobPattern = path.join(rootDir, '**/*');
  const ignoredFiles = ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.json'];

  if (watch) {
    const watcher = chokidar.watch(filesGlobPattern, {
      cwd,
      ignored: ignoredFiles,
    });

    watcher
      .on('add', assetPath => copyToOutDir(assetPath))
      .on('change', assetPath => copyToOutDir(assetPath))
      .on('unlink', assetPath => removeFromOutDir(assetPath));
  } else {
    const assets = globby.sync(filesGlobPattern, {
      cwd,
      ignore: ignoredFiles,
    });

    assets.forEach(assetPath => copyToOutDir(assetPath));
  }
};
