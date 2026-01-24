import { useDBContext } from '../contexts/DBProvider';

export function useDB() {
  return useDBContext();
}
