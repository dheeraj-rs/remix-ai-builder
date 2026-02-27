import type { FileMap } from '../../stores/files';

export function extractFilesForDeployment(
  files: FileMap,
): Array<{ path: string; content: string }> {
  const fileMap = new Map<string, string>();
  const excludePatterns = [
    /^node_modules\//,
    /^\.git\//,
    /^\.next\//,
    /^\.vercel\//,
    /^dist\//,
    /^build\//,
    /\.log$/,
    /^\.env/,
    /^\.DS_Store$/,
  ];

  for (const [filePath, fileData] of Object.entries(files)) {
    const shouldExclude = excludePatterns.some((pattern) =>
      pattern.test(filePath),
    );
    if (shouldExclude) {
      continue;
    }
    if (!fileData || fileData.type === 'folder') {
      continue;
    }

    const content = fileData.content || '';

    let relativePath = filePath;
    if (relativePath.startsWith('/home/project/')) {
      relativePath = relativePath.substring('/home/project/'.length);
    } else if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
    fileMap.set(relativePath, content);
  }

  const deploymentFiles = Array.from(fileMap.entries()).map(
    ([path, content]) => ({
      path,
      content,
    }),
  );

  return deploymentFiles;
}

export function validateDeploymentFiles(
  files: Array<{ path: string; content: string }>,
): {
  valid: boolean;
  error?: string;
} {
  if (files.length === 0) {
    return {
      valid: false,
      error: 'No files found. Please generate a website first.',
    };
  }

  const hasIndexFile = files.some(
    (f) => f.path === 'index.html' || f.path.endsWith('/index.html'),
  );
  const hasPackageJson = files.some((f) => f.path === 'package.json');

  if (!hasIndexFile && !hasPackageJson) {
    return {
      valid: false,
      error:
        'No index.html or package.json found. The website may not deploy correctly.',
    };
  }

  return { valid: true };
}
