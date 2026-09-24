module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  rules: {
    // Không cài eslint-plugin-react nên eslint không biết <Foo /> là đã dùng Foo,
    // báo mọi component là "khai báo mà không dùng". Bỏ qua định danh viết hoa để
    // rule còn lại có giá trị: no-undef mới là thứ bắt được lỗi trắng trang mà
    // `vite build` không bắt (dùng biến trước khi khai báo / gọi hàm không tồn tại).
    // Mức cảnh báo, không phải lỗi: 39 chỗ code chết đã có sẵn trong dự án từ
    // trước khi .jsx được lint. Đặt 'error' thì `yarn lint` đỏ vĩnh viễn và không
    // ai dùng nữa — báo mà không chặn thì còn đọc được.
    'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z]', args: 'none' }],
    'no-unreachable': 'warn',
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['dist', 'preview-dist'],
};
