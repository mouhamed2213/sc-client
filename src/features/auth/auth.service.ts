import { api } from "../../lib/api";
import { IRegister } from "../../types";

export const register = async (registerData: IRegister) => {
  const res = await api.post("/auth/register", {
    registerData,
  });

  return res.data;
};
