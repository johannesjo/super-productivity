import { SafFileAdapter } from './saf-file-adapter';
import { SafService } from './saf.service';

describe('SafFileAdapter', () => {
  let adapter: SafFileAdapter;

  beforeEach(() => {
    adapter = new SafFileAdapter();
  });

  describe('readFile', () => {
    it('should read file using SafService', async () => {
      const mockData = 'test file content';
      spyOn(SafService, 'readFile').and.returnValue(Promise.resolve(mockData));

      const result = await adapter.readFile('test.json');

      expect(SafService.readFile).toHaveBeenCalledWith('test.json');
      expect(result).toBe(mockData);
    });

    it('should throw file not found error with proper message', async () => {
      const fileName = 'missing.json';
      spyOn(SafService, 'readFile').and.returnValue(
        Promise.reject(new Error('File not found')),
      );

      await expectAsync(adapter.readFile(fileName)).toBeRejectedWithError(
        `File not found: ${fileName}`,
      );
    });

    it('should propagate other errors', async () => {
      const error = new Error('Permission denied');
      spyOn(SafService, 'readFile').and.returnValue(Promise.reject(error));

      await expectAsync(adapter.readFile('test.json')).toBeRejectedWith(error);
    });
  });

  describe('writeFile', () => {
    it('should write file using SafService', async () => {
      spyOn(SafService, 'writeFile').and.returnValue(Promise.resolve());

      await adapter.writeFile('test.json', '{"data": "test"}');

      expect(SafService.writeFile).toHaveBeenCalledWith('test.json', '{"data": "test"}');
    });

    it('should propagate write errors', async () => {
      const error = new Error('No space left');
      spyOn(SafService, 'writeFile').and.returnValue(Promise.reject(error));

      await expectAsync(
        adapter.writeFile('test.json', '{"data": "test"}'),
      ).toBeRejectedWith(error);
    });
  });

  describe('deleteFile', () => {
    it('should delete file using SafService', async () => {
      spyOn(SafService, 'deleteFile').and.returnValue(Promise.resolve());

      await adapter.deleteFile('test.json');

      expect(SafService.deleteFile).toHaveBeenCalledWith('test.json');
    });

    it('should ignore file not found errors', async () => {
      spyOn(SafService, 'deleteFile').and.returnValue(
        Promise.reject(new Error('File not found')),
      );
      spyOn(console, 'error');

      await adapter.deleteFile('missing.json');

      expect(console.error).toHaveBeenCalledWith(
        'File not found for deletion: missing.json',
      );
    });

    it('should propagate other delete errors', async () => {
      const error = new Error('Permission denied');
      spyOn(SafService, 'deleteFile').and.returnValue(Promise.reject(error));

      await expectAsync(adapter.deleteFile('test.json')).toBeRejectedWith(error);
    });
  });

  describe('checkDirExists', () => {
    it('should check permission using SafService', async () => {
      spyOn(SafService, 'checkPermission').and.returnValue(Promise.resolve(true));

      const result = await adapter.checkDirExists?.('any-path');

      expect(SafService.checkPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when no permission', async () => {
      spyOn(SafService, 'checkPermission').and.returnValue(Promise.resolve(false));

      const result = await adapter.checkDirExists?.('any-path');

      expect(result).toBe(false);
    });
  });
});
