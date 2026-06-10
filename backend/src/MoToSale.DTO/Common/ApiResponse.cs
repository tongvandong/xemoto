namespace MoToSale.DTO.Common;

/// <summary>Chuẩn hóa phản hồi API (theo khuôn BaseCore.DTO.Response).</summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null) => new() { Success = true, Data = data, Message = message };
    public static ApiResponse<T> Fail(string message) => new() { Success = false, Message = message };
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse Ok(string? message = null) => new() { Success = true, Message = message };
    public static new ApiResponse Fail(string message) => new() { Success = false, Message = message };
}
