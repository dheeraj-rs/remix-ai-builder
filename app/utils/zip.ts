import JSZip from 'jszip';
import type { FileMap } from '../stores/files';
import { WORK_DIR } from './constants';

export const exportProjectAsZip = async (files: FileMap) => {
  const zip = new JSZip();
  let projectName = 'project';
  const packageJsonEntry = files[`${WORK_DIR}/package.json`];
  if (packageJsonEntry && packageJsonEntry.type === 'file') {
    try {
      const packageJson = JSON.parse(packageJsonEntry.content);
      if (packageJson.name) {
        projectName = packageJson.name;
      }
    } catch (e) {
      console.error('Failed to parse package.json for project name', e);
    }
  }

  const addToZip = (currentFiles: FileMap) => {
    Object.entries(currentFiles).forEach(([path, dirent]) => {
      if (!dirent) return;
      let zipPath = path;

      if (path.startsWith(WORK_DIR)) {
        zipPath = path.substring(WORK_DIR.length);
      }

      if (zipPath.startsWith('/')) {
        zipPath = zipPath.substring(1);
      }
      
      if (!path.startsWith(WORK_DIR) || !zipPath) {
        return;
      }

      if (dirent.type === 'file') {
        zip.file(zipPath, dirent.content);
      } else if (dirent.type === 'folder') {
        zip.folder(zipPath);
      }
    });
  };

  addToZip(files);

  const content = await zip.generateAsync({ type: 'blob' });
  const fileSaver = await import('file-saver');
  const saveAs = fileSaver.saveAs || fileSaver.default?.saveAs || fileSaver.default;
  if (saveAs) {
    saveAs(content, `${projectName}.zip`);
  }
};
