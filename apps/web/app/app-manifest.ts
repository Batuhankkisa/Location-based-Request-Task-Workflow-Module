const matcher = {
  static: {},
  wildcard: {},
  dynamic: {}
};

export const id = 'dev';
export const timestamp = Date.now();
export const prerendered: string[] = [];
export { matcher };

export default {
  id,
  timestamp,
  matcher,
  prerendered
};
