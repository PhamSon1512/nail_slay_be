export const createId = () => crypto.randomUUID();
export const init = () => createId;
export const isCuid = (id: string) => id.length > 0;
