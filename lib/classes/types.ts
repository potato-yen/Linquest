export interface Class {
  id: string;
  owner_teacher_id: string;
  name: string;
  class_code: string;
  created_at: string;
}

export interface ClassMember {
  class_id: string;
  user_id: string;
  joined_at: string;
}
