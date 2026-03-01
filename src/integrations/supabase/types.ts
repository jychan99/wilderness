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
          DATE: string;
          CONTENT: string;
        };
        Insert: {
          ID: string;
          TITLE: string;
          DATE: string;
          CONTENT: string;
        };
        Update: {
          ID?: string;
          TITLE?: string;
          DATE?: string;
          CONTENT?: string;
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
      STUMAIN: {
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
      USERMAIN: {
        Row: {
          USER_CODE: string;
          ID: string;
          NAME: string;
          BAP_NAME: string;
          PASSWORD: string;
          POSITION: string;
          MANAGE_GRADE: string;
        };
        Insert: {
          USER_CODE: string;
          ID: string;
          NAME: string;
          BAP_NAME: string;
          PASSWORD: string;
          POSITION: string;
          MANAGE_GRADE: string;
        };
        Update: {
          USER_CODE?: string;
          ID?: string;
          NAME?: string;
          BAP_NAME?: string;
          PASSWORD?: string;
          POSITION?: string;
          MANAGE_GRADE?: string;
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
