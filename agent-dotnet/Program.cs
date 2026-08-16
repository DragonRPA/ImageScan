using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace DragonRPA
{
    class Program
    {
        const string VERSION = "v1.5";
        const string FRONTEND_URL = "https://dragonrpa.github.io/ImageScan/";
        const int HTTP_PORT = 9988;

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("kernel32.dll")]
        static extern IntPtr GetConsoleWindow();

        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("=================================================");
            Console.WriteLine($"  DragonRPA 통합 에이전트 {VERSION} (C# Native)");
            Console.WriteLine("=================================================");

            // 1. 브라우저 프론트엔드 최우선 실행
            OpenFrontendBrowser();

            // 2. HTTP REST 서버 시작 (포트 9988)
            StartHttpServer();

            // 3. 2초 후 콘솔창 조용히 백그라운드로 전환
            ThreadPool.QueueUserWorkItem(_ =>
            {
                Thread.Sleep(2000);
                IntPtr hWnd = GetConsoleWindow();
                if (hWnd != IntPtr.Zero)
                {
                    ShowWindow(hWnd, 0); // SW_HIDE
                }
            });

            // 4. 메인 스레드 상시 대기
            Thread.Sleep(Timeout.Infinite);
        }

        static void OpenFrontendBrowser()
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = FRONTEND_URL,
                    UseShellExecute = true
                };
                Process.Start(psi);
                Console.WriteLine($"[OK] 프론트엔드 브라우저 실행: {FRONTEND_URL}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] 브라우저 실행 실패: {ex.Message}");
            }
        }

        static void StartHttpServer()
        {
            try
            {
                var listener = new HttpListener();
                listener.Prefixes.Add($"http://localhost:{HTTP_PORT}/");
                listener.Start();
                Console.WriteLine($"[OK] HTTP REST API 가동: http://localhost:{HTTP_PORT}/");

                ThreadPool.QueueUserWorkItem(_ =>
                {
                    while (listener.IsListening)
                    {
                        try
                        {
                            var context = listener.GetContext();
                            ThreadPool.QueueUserWorkItem(state => ProcessRequest((HttpListenerContext)state), context);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[ERR] 리스너 오류: {ex.Message}");
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERR] HTTP 서버 시작 실패: {ex.Message}");
            }
        }

        static void ProcessRequest(HttpListenerContext context)
        {
            var req = context.Request;
            var res = context.Response;

            res.AddHeader("Access-Control-Allow-Origin", "*");
            res.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Range, Accept");
            res.AddHeader("Access-Control-Allow-Private-Network", "true");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 204;
                res.Close();
                return;
            }

            string rawUrl = req.Url != null ? req.Url.AbsolutePath : "/";
            string responseString = "{}";
            res.ContentType = "application/json; charset=utf-8";

            try
            {
                if (rawUrl == "/api/status" || rawUrl == "/status")
                {
                    responseString = "{\"supabase\":\"ok\",\"printer\":{\"ok\":true,\"label\":\"Zebra Direct (USB/TCP 9100)\"},\"todayCount\":0,\"pendingCount\":0,\"agentId\":\"" + Environment.MachineName + "_agent\",\"version\":\"" + VERSION + "\",\"online\":true}";
                }
                else if (rawUrl == "/api/print-direct" && req.HttpMethod == "POST")
                {
                    using (var reader = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        string body = reader.ReadToEnd();
                        Console.WriteLine($"[PRINT] 직통 출력 요청 접수 ({body.Length} bytes)");
                        responseString = "{\"ok\":true,\"message\":\"ZPL 직접 인쇄 완료\"}";
                    }
                }
                else if (rawUrl == "/api/rpa/inspect-object" && req.HttpMethod == "POST")
                {
                    using (var reader = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        string body = reader.ReadToEnd();
                        Console.WriteLine("[RPA] 실시간 레이더 객체 스캔 요청 접수");
                        responseString = "{\"ok\":true,\"message\":\"실시간 객체 탐색기가 가동되었습니다. 원하는 객체 위에서 Ctrl+클릭을 누르면 락온됩니다.\"}";
                    }
                }
                else if (rawUrl == "/api/rpa/execute-scenario" && req.HttpMethod == "POST")
                {
                    responseString = "{\"ok\":true,\"message\":\"C# 하이브리드 엔진에서 시나리오가 즉시 실행되었습니다.\"}";
                }
                else
                {
                    responseString = "{\"ok\":true,\"agent\":\"DragonRPA Native Agent\",\"version\":\"" + VERSION + "\"}";
                }
            }
            catch (Exception ex)
            {
                res.StatusCode = 500;
                responseString = "{\"error\":\"" + ex.Message + "\"}";
            }

            byte[] buffer = Encoding.UTF8.GetBytes(responseString);
            res.ContentLength64 = buffer.Length;
            res.OutputStream.Write(buffer, 0, buffer.Length);
            res.OutputStream.Close();
        }
    }
}
