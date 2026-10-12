import axios, { InternalAxiosRequestConfig } from "axios";

// baseURL : import.meta.VITE_API_URL,

export const api = axios.create({
  baseURL: "http://localhost:4000/api",
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
