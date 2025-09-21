import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./axiosInstance";

// Initial State
interface AuthState {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

const loadInitialState = (): AuthState => {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (token && user) {
      return {
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        isError: false,
        error: null,
      };
    }
  } catch {
    localStorage.clear();
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isError: false,
    error: null,
  };
};

// Login
export const login = createAsyncThunk(
  "auth/login",
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/auth/login", payload);
      const { user, tokens } = response.data;

      if (!user || !tokens?.access?.token) {
        throw new Error("Invalid response from server");
      }

      // Save to localStorage
      localStorage.setItem("token", tokens.access.token);
      localStorage.setItem("user", JSON.stringify(user));

      return { user, token: tokens.access.token };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || "Login failed");
    }
  }
);

// Slice
const authSlice = createSlice({
  name: "auth",
  initialState: loadInitialState() as AuthState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isError = false;
      state.error = null;
      localStorage.clear();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });
  },
});

// Exports
export const { logout } = authSlice.actions;
export default authSlice.reducer;
