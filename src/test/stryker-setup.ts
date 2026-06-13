/**
 * Stryker setup — stub các CF Workers-specific imports khi chạy trong Node env.
 *
 * Vitest stryker config dùng môi trường Node (không phải CF pool).
 * Một số module của project import từ '../db' (DrizzleDb type) — chỉ là type import
 * nên không cần stub thực sự.
 *
 * File này chủ yếu là placeholder để đảm bảo vitest setup hoạt động đúng.
 */

// Không có global setup cần thiết cho pure util tests.
// Nếu sau này cần mock thêm CF bindings, thêm vào đây.
export {};
