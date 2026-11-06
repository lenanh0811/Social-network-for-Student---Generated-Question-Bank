import { apiClient } from "./api.config";
import {
  CreateDirectConversationResponse,
  GetConversationsResponse,
} from "@/modules/messaging-notification/api/interfaces/messages.interface";

/**
 * @param after - Timestamp của tin nhắn cuối để lấy trang tiếp theo
 */

export const getConversations = async (
  after?: number,
): Promise<GetConversationsResponse> => {
  const response = await apiClient.get("/conversations", {
    params: {
      limit: 10,
      ...(after !== undefined && { after }),
    },
  });
  return response.data;
};

export const createDirectConversation = async <TRequest extends object>(
  payload: TRequest,
): Promise<CreateDirectConversationResponse> => {
  const response = await apiClient.post<CreateDirectConversationResponse>(
    "/conversations/direct",
    payload,
  );

  return response.data;
};
