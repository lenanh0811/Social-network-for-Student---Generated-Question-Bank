// chức năng lấy danh sách hội thoại path : /conservations
interface LastMessage {
  message_id: number;
  content: string;
  message_type: string;
  created_at: string;
}

interface Conversation {
  conversation_id: number;
  type: "DIRECT" | "GROUP";
  display_name: string;
  display_avatar_url: string;
  member_count: number;
  last_message: LastMessage | null;
  unread_count: number;
  hidden_at: string | null;
  updated_at: string;
  muted: boolean;
}

interface ConversationPagination {
  before: number;
  after: number;
  has_prev: boolean;
  has_next: boolean;
}

export interface GetConversationsResponse {
  code: string;
  message: string;
  data: {
    items: Conversation[];
    pagination: ConversationPagination;
    total_conversations: number;
  };
}
// ===== hết chức năng get / conservations

// chức năng tạo hội thoại trực tiếp path : /conservations/direct
interface ConversationMember {
  user_id: number;
  full_name: string;
  avatar_url: string;
  frame_url: string;
  role: string;
  created_at: string;
}

interface DirectConversation {
  conversation_id: number;
  type: "DIRECT";
  name: string;
  avatar_url: string;
  members: ConversationMember[];
  created_at: string;
}

export interface CreateDirectConversationResponse {
  code: string;
  message: string;
  data: DirectConversation;
}
