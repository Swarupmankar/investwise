import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UsersUiState {
  search: string;
  page: number;
  limit: number;
}

const initialState: UsersUiState = {
  search: "",
  page: 1,
  limit: 10,
};

const usersSlice = createSlice({
  name: "usersUi",
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setLimit(state, action: PayloadAction<number>) {
      state.limit = action.payload;
      state.page = 1;
    },
  },
});

export const { setSearch, setPage, setLimit } = usersSlice.actions;
export default usersSlice.reducer;
