import axios from "axios";

    // baseURL : import.meta.VITE_API_URL,

export const api  = axios.create({
    baseURL : "http://localhost:4000/api",
    headers : {
        "Content-Type" : "application/json"
    }
})