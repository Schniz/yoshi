import path from 'path';
import fs from 'fs-extra';
import defaultsDeep from 'lodash/defaultsDeep';
import isEqual from 'lodash/isEqual';

export const enforceTsconfig = ({
  outDir,
  rootDir,
  cwd,
}: {
  outDir: string;
  rootDir: string;
  cwd: string;
}) => {
  const enforcedTsconfigOptions = {
    include: [rootDir],
    compilerOptions: {
      target: 'ESNext',
      module: 'esnext',
      lib: ['dom', 'esnext'],
      moduleResolution: 'node',
      rootDir,
      outDir,
      declarationDir: 'dist/types',
      declaration: true,
      sourceMap: true,
      importHelpers: true,
      esModuleInterop: true,
      jsx: 'react',
    },
  };

  const userTsconfigPath = path.join(cwd, 'tsconfig.json');
  const userTsconfig = fs.readJSONSync(userTsconfigPath);
  const mergedTsconfig = defaultsDeep(enforcedTsconfigOptions, userTsconfig);

  // if there's a change in tsconfig, write the new one
  if (!isEqual(mergedTsconfig, userTsconfig)) {
    console.log('');
    console.log('> differences were found between tsconfig.json options');
    console.log(
      '> rewriting tsconfig.json with "yoshi-flow-library\'s options',
    );
    console.log('');

    fs.outputFileSync(
      userTsconfigPath,
      JSON.stringify(mergedTsconfig, null, 2),
    );
  }
};
