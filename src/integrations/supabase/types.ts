export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      SCHEDULE: {
        Row: {
          ID: string;
          TITLE: string;
          START_DATE: string;
          END_DATE: string;
          CONTENT: string;
          USER_CODE: string;
          COLOR: string;
        };
        Insert: {
          ID: string;
          TITLE: string;
          START_DATE: string;
          END_DATE: string;
          CONTENT: string;
          USER_CODE: string;
          COLOR: string;
        };
        Update: {
          ID?: string;
          TITLE?: string;
          START_DATE?: string;
          END_DATE?: string;
          CONTENT?: string;
          USER_CODE?: string;
          COLOR?: string;
        };
      };
      MEETING: {
        Row: {
          ID: string;
          TITLE: string;
          CONTENT: string;
          AUTHOR: string;
          DATE: string;
        };
        Insert: {
          ID: string;
          TITLE: string;
          CONTENT: string;
          AUTHOR: string;
          DATE: string;
        };
        Update: {
          ID?: string;
          TITLE?: string;
          CONTENT?: string;
          AUTHOR?: string;
          DATE?: string;
        };
      };
      STU_MAIN: {
        Row: {
          USER_CODE: string;
          NAME: string;
          BAP_NAME: string;
          GRADE: string;
          NAME_DAY: string;
          CONTACT: string;
          FAMILY_CONTACT: string;
          NOTE: string;
        };
        Insert: {
          USER_CODE: string;
          NAME: string;
          BAP_NAME: string;
          GRADE: string;
          NAME_DAY: string;
          CONTACT: string;
          FAMILY_CONTACT: string;
          NOTE: string;
        };
        Update: {
          USER_CODE?: string;
          NAME?: string;
          BAP_NAME?: string;
          GRADE?: string;
          NAME_DAY?: string;
          CONTACT?: string;
          FAMILY_CONTACT?: string;
          NOTE?: string;
        };
      };
      ATTENDANCE: {
        Row: {
          ID: string;
          USER_CODE: string;
          NAME: string;
          DATE: string;
          MISSA_YN: boolean;
          DOCTRINE_YN: boolean;
        };
        Insert: {
          ID: string;
          USER_CODE: string;
          NAME: string;
          DATE: string;
          MISSA_YN: boolean;
          DOCTRINE_YN: boolean;
        };
        Update: {
          ID?: string;
          USER_CODE?: string;
          NAME?: string;
          DATE?: string;
          MISSA_YN?: boolean;
          DOCTRINE_YN?: boolean;
        };
      };
      ACCOUNT: {
        Row: {
          ID: string;
          DATE: string;
          TYPE: "income" | "expense";
          CATEGORY: string;
          CONTENT: string;
          AMOUNT: number;
          REGISTERED_BY: string;
        };
        Insert: {
          ID: string;
          DATE: string;
          TYPE: "income" | "expense";
          CATEGORY: string;
          CONTENT: string;
          AMOUNT: number;
          REGISTERED_BY: string;
        };
        Update: {
          ID?: string;
          DATE?: string;
          TYPE?: "income" | "expense";
          CATEGORY?: string;
          CONTENT?: string;
          AMOUNT?: number;
          REGISTERED_BY?: string;
        };
      };
      NOTIFICATION: {
        Row: {
          ID: string;
          TITLE: string;
          CONTENT: string;
          AUTHOR: string;
          POSITION: string;
          CREATED_AT: string;
        };
        Insert: {
          ID: string;
          TITLE: string;
          CONTENT: string;
          AUTHOR: string;
          POSITION: string;
          CREATED_AT: string;
        };
        Update: {
          ID?: string;
          TITLE?: string;
          CONTENT?: string;
          AUTHOR?: string;
          POSITION?: string;
          CREATED_AT?: string;
        };
      };
      USER_MAIN: {
        Row: {
          USER_CODE: string;
          ID: string;
          NAME: string;
          BAP_NAME: string;
          PASSWORD: string;
          POSITION: string;
          USE_YN: boolean;
        };
        Insert: {
          USER_CODE: string;
          ID: string;
          NAME: string;
          BAP_NAME: string;
          PASSWORD: string;
          POSITION: string;
          USE_YN: boolean;
        };
        Update: {
          USER_CODE?: string;
          ID?: string;
          NAME?: string;
          BAP_NAME?: string;
          PASSWORD?: string;
          POSITION?: string;
          USE_YN?: boolean;
        };
      };
      USER_MANAGE_GRADE: {
        Row: {
          USER_CODE: string;
          MANAGE_GRADE: string;
        };
        Insert: {
          USER_CODE: string;
          MANAGE_GRADE: string;
        };
        Update: {
          USER_CODE?: string;
          MANAGE_GRADE?: string;
        };
      };
      BOARD: {
        Row: {
          ID: number;
          BOARD_CODE: string;
          USER_CODE: string;
          CATEGORY: string;
          TITLE: string;
          CONTENT: string;
          VIEW: number;
          IS_DELETED: boolean;
          IS_PINNED: boolean;
          IS_ANNONYMOUS: boolean;
          CREATED_AT: string;
          UPDATED_AT: string;
        };
        Insert: {
          ID: number;
          BOARD_CODE: string;
          USER_CODE: string;
          CATEGORY: string;
          TITLE: string;
          CONTENT: string;
          VIEW: number;
          IS_DELETED: boolean;
          IS_PINNED: boolean;
          IS_ANNONYMOUS: boolean;
          CREATED_AT: string;
          UPDATED_AT: string;
        };
        Update: {
          ID?: number;
          BOARD_CODE?: string;
          USER_CODE?: string;
          CATEGORY?: string;
          TITLE?: string;
          CONTENT?: string;
          VIEW?: number;
          IS_DELETED?: boolean;
          IS_PINNED?: boolean;
          IS_ANNONYMOUS?: boolean;
          CREATED_AT?: string;
          UPDATED_AT?: string;
        };
      };
      POST_LIKES: {
        Row: {
          POST_ID: number;
          USER_CODE: string;
          IS_LIKE: boolean;
        };
        Insert: {
          POST_ID: number;
          USER_CODE: string;
          IS_LIKE: boolean;
        };
        Update: {
          POST_ID?: number;
          USER_CODE?: string;
          IS_LIKE?: boolean;
        };
      };
      COMMENTS: {
        Row: {
          ID: number;
          POST_ID: number;
          USER_CODE: string;
          PARENT_ID: number;
          CONTENT: string;
          CREATED_AT: string;
        };
        Insert: {
          ID: number;
          POST_ID: number;
          USER_CODE: string;
          PARENT_ID: number;
          CONTENT: string;
          CREATED_AT: string;
        };
        Update: {
          ID?: number;
          POST_ID?: number;
          USER_CODE?: string;
          PARENT_ID?: number;
          CONTENT?: string;
          CREATED_AT?: string;
        };
      };
      COMMENTS_LIKES: {
        Row: {
          COMMENT_ID: number;
          USER_CODE: string;
          IS_LIKE: boolean;
        };
        Insert: {
          COMMENT_ID: number;
          USER_CODE: string;
          IS_LIKE: boolean;
        };
        Update: {
          COMMENT_ID?: number;
          USER_CODE?: string;
          IS_LIKE?: boolean;
        };
      };
      GRADE_CODE: {
        Row: {
          CODE: string;
          NAME: string;
          PARENT_CODE: string;
          LEVEL: number;
        };
        Insert: {
          CODE: string;
          NAME: string;
          PARENT_CODE: string;
          LEVEL: number;
        };
        Update: {
          CODE?: string;
          NAME?: string;
          PARENT_CODE?: string;
          LEVEL?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
