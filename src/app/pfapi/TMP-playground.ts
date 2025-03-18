import {} from './pfapi';
import { ModelCfg } from './pfapi.model';
import { ModelCtrl } from './model-ctrl/model-ctrl';
import { Dropbox } from './sync/providers/dropbox';
import { DROPBOX_APP_KEY } from '../imex/sync/dropbox/dropbox.const';

interface MyModel {
  id: string;
  name: string;
  age: number;
}

interface MyModel2 {
  fooo: boolean;
}

type ModelCfgs = {
  m1: ModelCfg<MyModel>;
  m2: ModelCfg<MyModel2>;
};

const modelCfgs: ModelCfgs = {
  m1: {
    modelVersion: 1,
  },
  m2: {
    modelVersion: 1,
  },
  // THIS PART IS IMPORTANT!!!
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const pf = new (modelCfgs, {})();
pf.setActiveProvider(
  new Dropbox({
    appKey: DROPBOX_APP_KEY,
  }),
);

const _typeCheck: ModelCtrl<MyModel> = {} as typeof pf.m.m1;
console.log(_typeCheck);

// SHOULD WORK => this should work (and it does)
console.log(pf.m.m1.save({ id: 'AA', name: 'test', age: 10 }));
console.log(pf.m.m2.save({ fooo: true }));

// EXPECT ERROR => this should error (and it does NOT)
// console.log(
//   pf.m.m1.save({ id: 'AA', name: 'test', age: 10, fooo: true, additional: 'aaa' }),
// );
// console.log(pf.m.m2.save({ id: 'xx', name: 'test', age: 10 }));
