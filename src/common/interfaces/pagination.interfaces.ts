export interface IPaginationOuterData<T> {
  data: T[];
  page: number;
  total: number;
  limit: number;
};

export interface IPaginationInnerData {
  offset: number;
  actualPage: number;
};