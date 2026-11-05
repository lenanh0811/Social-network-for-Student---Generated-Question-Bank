import axios from "axios";
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const access_token = localStorage.getItem("access_token");

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${access_token}` || "",
  },
});
