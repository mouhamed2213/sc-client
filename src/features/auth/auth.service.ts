import { api } from "../../lib/api";
import { IRegister } from "../../types";

export const register = async (registerData: IRegister) => {
  const res = await api.post("/auth/register", {
    email: registerData.email,
    password: registerData.password,
    nom: registerData.name,
  });

  return res.data;
};
