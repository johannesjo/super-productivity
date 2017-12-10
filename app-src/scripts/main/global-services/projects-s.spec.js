'use strict';

describe('Service: Projects', () => {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  let Projects;
  beforeEach(inject((_Projects_) => {
    Projects = _Projects_;
  }));

  it('should be defined', () => {
    expect(true).toBe(true);
  });

  describe('unit', () => {
    describe('getListWithLsData()', () => {
      it('should use AppStorage to get results', inject((AppStorage) => {
        AppStorage.getProjects = sinon.stub()
          .returns('TEST');

        const result = Projects.getListWithLsData();
        expect(result).toBe('TEST');
      }));
    });

    describe('getAndUpdateCurrent()', () => {
      let $rootScope;

      beforeEach(inject((_$rootScope_) => {
        $rootScope = _$rootScope_;
        $rootScope.r = {};
        $rootScope.r.projects = [{ id: 'FAKE_ID' }];
      }));

      it('should return the current project', () => {
        const result = Projects.getAndUpdateCurrent();
        expect(result).toEqual({ id: 'FAKE_ID' });
      });

      it('should set the same referenced object for r.projects and r.currentProject', () => {
        const result = Projects.getAndUpdateCurrent();
        expect(result).toBe($rootScope.r.projects[0]);
      });
    });
  });
});