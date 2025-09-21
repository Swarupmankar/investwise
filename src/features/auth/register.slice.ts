import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PendingRegistration } from "@/types/users/register.types";

interface RegisterState {
  pendingRegistration: PendingRegistration | null; 
}

const initialState: RegisterState = {
  pendingRegistration: null,
};

const registerSlice = createSlice({
  name: "register",
  initialState,
  reducers: {
    setPendingRegistration(state, action: PayloadAction<PendingRegistration>) {
      state.pendingRegistration = action.payload;
    },
    clearPendingRegistration(state) {
      state.pendingRegistration = null;
    },
  },
});

export const { setPendingRegistration, clearPendingRegistration } =
  registerSlice.actions;
export default registerSlice.reducer;
