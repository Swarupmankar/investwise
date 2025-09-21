// src/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./API/baseApi";
import authReducer from "./API/auth.api";
import registerReducer from "@/features/auth/register.slice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    register: registerReducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
