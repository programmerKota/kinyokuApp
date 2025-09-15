// バリデーション関連のユーティリティ関数

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// 未使用の詳細バリデーション（メール、パスワード、電話、郵便番号、数値/範囲/URL）は削除

export const validateRequired = (
  value: string,
  fieldName: string
): ValidationResult => {
  if (!value || value.trim() === "") {
    return { isValid: false, message: `${fieldName}を入力してください` };
  }

  return { isValid: true };
};

export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): ValidationResult => {
  if (value.length > maxLength) {
    return {
      isValid: false,
      message: `${fieldName}は${maxLength}文字以下で入力してください`,
    };
  }

  return { isValid: true };
};

