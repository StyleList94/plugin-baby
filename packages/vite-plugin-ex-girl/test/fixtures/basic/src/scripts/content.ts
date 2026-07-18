import { GREETING } from './shared';

console.log(`[fixture] ${GREETING}`);

void import('./helper').then(({ helperMessage }) => {
  console.log(helperMessage());
});
