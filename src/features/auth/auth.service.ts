import axios from "axios";
import { redirect } from "react-router-dom";
import { api } from "../../lib/api";
import { ApiError } from "../../lib/apiError";
import { IRegister, Login } from "../../types";

interface LoginResponse {
  user: {
    id: number;
    email: string;
    nom: string;
    role: "CLIENT" | "ADMIN";
    emailVerified: boolean;
  };
  token: string;
}

export const register = async (registerData: IRegister) => {
  try {
    const res = await api.post("/auth/register", {
      email: registerData.email,
      password: registerData.password,
      nom: registerData.name,
    });

    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        error.response?.data?.error?.message ?? "Une erreur est survenue.",
        error.response?.data?.error?.code,
        error.response?.status
      );
    }

    throw error;
  }
};

export const login = async (loginData: Login) => {
  try {
    const res = await api.post<LoginResponse>("/auth/login", loginData);

    localStorage.setItem("client_token", res.data.token);
    localStorage.setItem(
      "client_user",
      JSON.stringify({
        name: res.data.user.nom,
        email: res.data.user.email,
      })
    );

    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        error.response?.data?.error?.message ?? "Une erreur est survenue.",
        error.response?.data?.error?.code,
        error.response?.status
      );
    }

    throw error;
  }
};

export const logout = () => {
  // clean localstorage
  localStorage.clear();
  return redirect("/login");
};
