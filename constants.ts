import { WordDefinition } from './types';

export const VOCAB_LIST: WordDefinition[] = [
  { id: '1', targets: ['grandfather', 'grandpa'], meaning: '祖父，外祖父' },
  { id: '2', targets: ['uncle'], meaning: '舅父，叔父，伯父' },
  { id: '3', targets: ['aunt'], meaning: '舅母，婶母，伯母' },
  { id: '4', targets: ['grandmother', 'grandma'], meaning: '祖母，外祖母' },
  { id: '5', targets: ['cousin'], meaning: '堂兄(弟)，表姐(妹)' },
  { id: '6', targets: ['cool'], meaning: '妙极的，酷的' },
  { id: '7', targets: ['me'], meaning: '我' },
  { id: '8', targets: ['wow'], meaning: '哇，呀' },
  { id: '9', targets: ['big'], meaning: '大的' },
  { id: '10', targets: ['it'], meaning: '它 (指婴儿)' },
  { id: '11', targets: ['happy'], meaning: '幸福的' },
  { id: '12', targets: ['love'], meaning: '爱，热爱' },
];

export const GAME_CONSTANTS = {
  GAME_DURATION_SEC: 90, // Slower pace, more time
  LIVES: 5, // More chances for mistakes
  GRID_SIZE: 9, // 3x3 Grid
};