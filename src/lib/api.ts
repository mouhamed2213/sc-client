import axios, { InternalAxiosRequestConfig } from "axios";

// VITE_API_URL doit contenir la base de l’API, y compris /api (ex. https://api.example.com/api).

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// interceptor

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // get token
  const token = localStorage.getItem("client_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API RESPONSE TYPE

export type apiResponse<T> = {
  data: {
    data: T;
    status: number;
    message?: string;
    success?: string;
  };
};
