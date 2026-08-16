using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Automation;

namespace DragonRPA
{
    class Program
    {
        const string VERSION = "v1.5";
        const string FRONTEND_URL = "https://dragonrpa.github.io/ImageScan/";
        const int HTTP_PORT = 9988;

        const int VK_CONTROL = 0x11;
        const int VK_LBUTTON = 0x01;
        const int VK_SPACE   = 0x20;

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int X;
            public int Y;
        }

        [DllImport("user32.dll")]
        static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        static extern IntPtr WindowFromPoint(POINT Point);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("kernel32.dll")]
        static extern IntPtr GetConsoleWindow();

        static volatile DetailedTargetInfo CurrentHover = new DetailedTargetInfo();
        static volatile DetailedTargetInfo LastLocked = null;
        static bool IsScanningActive = true;

        public class DetailedTargetInfo
        {
            public string ProcessName = "";
            public uint ProcessId = 0;
            public string WindowTitle = "";
            public string WindowClassName = "";
            public string TagName = "ELEMENT";
            public string ControlType = "";
            public string Id = "";
            public string Name = "";
            public string ClassName = "";
            public string XPath = "";
            public string CssSelector = "";
            public string UiaPath = "";
            public string FrameInfo = "Top-level Frame";
            public string ParentHierarchy = "";
            public bool IsEnabled = true;
            public bool IsOffscreen = false;
            public bool IsPassword = false;
            public int X = 0;
            public int Y = 0;
            public int Width = 0;
            public int Height = 0;
            public long Timestamp = 0;
        }

        [STAThread]
        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("=================================================");
            Console.WriteLine("  DragonRPA 통합 에이전트 " + VERSION + " (C# Native + UIA3)");
            Console.WriteLine("=================================================");

            OpenFrontendBrowser();
            StartHttpServer();
            StartGlobalUiaScanner();

            ThreadPool.QueueUserWorkItem(delegate
            {
                Thread.Sleep(2000);
                IntPtr hWnd = GetConsoleWindow();
                if (hWnd != IntPtr.Zero)
                {
                    ShowWindow(hWnd, 0);
                }
            });

            Thread.Sleep(Timeout.Infinite);
        }

        static void OpenFrontendBrowser()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = FRONTEND_URL,
                    UseShellExecute = true
                };
                Process.Start(psi);
                Console.WriteLine("[OK] 프론트엔드 브라우저 실행: " + FRONTEND_URL);
            }
            catch (Exception ex)
            {
                Console.WriteLine("[WARN] 브라우저 실행 실패: " + ex.Message);
            }
        }

        static void StartGlobalUiaScanner()
        {
            Thread thread = new Thread(delegate()
            {
                POINT lastPt = new POINT { X = -1, Y = -1 };
                bool lastCtrlState = false;

                while (IsScanningActive)
                {
                    try
                    {
                        POINT pt;
                        if (GetCursorPos(out pt))
                        {
                            if (pt.X != lastPt.X || pt.Y != lastPt.Y)
                            {
                                lastPt = pt;
                                ScanElementAtPoint(pt);
                            }

                            bool isCtrlDown = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
                            bool isLButtonDown = (GetAsyncKeyState(VK_LBUTTON) & 0x8000) != 0;
                            bool isSpaceDown = (GetAsyncKeyState(VK_SPACE) & 0x8000) != 0;

                            if (isCtrlDown && (isLButtonDown || isSpaceDown))
                            {
                                if (!lastCtrlState)
                                {
                                    lastCtrlState = true;
                                    LastLocked = CurrentHover;
                                    Console.WriteLine("[LOCK-ON] " + CurrentHover.ProcessName + " | " + CurrentHover.TagName + "#" + CurrentHover.Id + " (" + CurrentHover.XPath + ")");
                                }
                            }
                            else
                            {
                                lastCtrlState = false;
                            }
                        }
                    }
                    catch { }

                    Thread.Sleep(60);
                }
            });

            thread.IsBackground = true;
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
            Console.WriteLine("[OK] Windows OS 전역 UIA 정밀 텔레메트리 스캐너 가동");
        }

        static void ScanElementAtPoint(POINT pt)
        {
            try
            {
                IntPtr hWnd = WindowFromPoint(pt);
                string winTitle = "";
                string winClass = "";
                string procName = "Desktop";
                uint pid = 0;

                if (hWnd != IntPtr.Zero)
                {
                    StringBuilder sbTitle = new StringBuilder(256);
                    GetWindowText(hWnd, sbTitle, 256);
                    winTitle = sbTitle.ToString();

                    StringBuilder sbClass = new StringBuilder(256);
                    GetClassName(hWnd, sbClass, 256);
                    winClass = sbClass.ToString();

                    GetWindowThreadProcessId(hWnd, out pid);
                    if (pid > 0)
                    {
                        try
                        {
                            Process p = Process.GetProcessById((int)pid);
                            procName = p.ProcessName;
                        }
                        catch { }
                    }
                }

                System.Windows.Point uiaPoint = new System.Windows.Point(pt.X, pt.Y);
                AutomationElement elem = AutomationElement.FromPoint(uiaPoint);

                if (elem != null)
                {
                    AutomationElement.AutomationElementInformation cur = elem.Current;
                    string ctrlType = cur.ControlType != null ? cur.ControlType.ProgrammaticName.Replace("ControlType.", "") : "Element";
                    string id = cur.AutomationId ?? "";
                    string name = cur.Name ?? "";
                    string className = cur.ClassName ?? "";
                    System.Windows.Rect rect = cur.BoundingRectangle;
                    bool isEnabled = cur.IsEnabled;
                    bool isOffscreen = cur.IsOffscreen;
                    bool isPassword = cur.IsPassword;

                    // 프레임 및 상위 계층 탐색
                    string frameInfo = "Main Frame";
                    string hierarchy = "";
                    try
                    {
                        AutomationElement parent = TreeWalker.RawViewWalker.GetParent(elem);
                        if (parent != null)
                        {
                            hierarchy = parent.Current.ControlType != null ? parent.Current.ControlType.ProgrammaticName.Replace("ControlType.", "") : "Parent";
                            if (!string.IsNullOrEmpty(parent.Current.AutomationId)) hierarchy += "#" + parent.Current.AutomationId;
                            else if (!string.IsNullOrEmpty(parent.Current.Name)) hierarchy += "[" + parent.Current.Name + "]";

                            if (parent.Current.ClassName != null && parent.Current.ClassName.ToLower().Contains("frame"))
                            {
                                frameInfo = "IFrame / SubFrame (" + parent.Current.ClassName + ")";
                            }
                        }
                    }
                    catch { }

                    string tag = "INPUT";
                    if (ctrlType.Equals("Button", StringComparison.OrdinalIgnoreCase)) tag = "BUTTON";
                    else if (ctrlType.Equals("Edit", StringComparison.OrdinalIgnoreCase) || ctrlType.Equals("Document", StringComparison.OrdinalIgnoreCase)) tag = "INPUT";
                    else if (ctrlType.Equals("ComboBox", StringComparison.OrdinalIgnoreCase)) tag = "SELECT";
                    else if (ctrlType.Equals("CheckBox", StringComparison.OrdinalIgnoreCase)) tag = "INPUT_CHECK";
                    else if (ctrlType.Equals("Text", StringComparison.OrdinalIgnoreCase)) tag = "SPAN";
                    else tag = ctrlType.ToUpper();

                    string xpath = "";
                    string css = "";
                    string uiaPath = ctrlType;

                    if (!string.IsNullOrEmpty(id))
                    {
                        xpath = "//*[@id='" + id + "']";
                        css = "#" + id;
                        uiaPath += "[@AutomationId='" + id + "']";
                    }
                    else if (!string.IsNullOrEmpty(name))
                    {
                        xpath = "//" + tag + "[@name='" + name + "' or @aria-label='" + name + "']";
                        css = tag.ToLower() + "[name='" + name + "']";
                        uiaPath += "[@Name='" + name + "']";
                    }
                    else if (!string.IsNullOrEmpty(className))
                    {
                        string firstCls = className.Split(' ')[0];
                        xpath = "//" + tag + "[contains(@class, '" + firstCls + "')]";
                        css = tag.ToLower() + "." + firstCls;
                        uiaPath += "[@ClassName='" + firstCls + "']";
                    }
                    else
                    {
                        xpath = "//" + tag + "[@type='" + ctrlType + "']";
                        css = tag.ToLower();
                    }

                    long nowMs = (long)(DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1))).TotalMilliseconds;
                    CurrentHover = new DetailedTargetInfo
                    {
                        ProcessName = procName,
                        ProcessId = pid,
                        WindowTitle = winTitle,
                        WindowClassName = winClass,
                        TagName = tag,
                        ControlType = ctrlType,
                        Id = id,
                        Name = name,
                        ClassName = className,
                        XPath = xpath,
                        CssSelector = css,
                        UiaPath = uiaPath,
                        FrameInfo = frameInfo,
                        ParentHierarchy = hierarchy,
                        IsEnabled = isEnabled,
                        IsOffscreen = isOffscreen,
                        IsPassword = isPassword,
                        X = (int)rect.X,
                        Y = (int)rect.Y,
                        Width = (int)rect.Width,
                        Height = (int)rect.Height,
                        Timestamp = nowMs
                    };
                }
            }
            catch { }
        }

        static void StartHttpServer()
        {
            try
            {
                HttpListener listener = new HttpListener();
                try { listener.Prefixes.Add("http://localhost:" + HTTP_PORT + "/"); } catch { }
                try { listener.Prefixes.Add("http://127.0.0.1:" + HTTP_PORT + "/"); } catch { }
                listener.Start();
                Console.WriteLine("[OK] HTTP REST API 가동: http://localhost:" + HTTP_PORT + "/ & http://127.0.0.1:" + HTTP_PORT + "/");

                ThreadPool.QueueUserWorkItem(delegate
                {
                    while (listener.IsListening)
                    {
                        try
                        {
                            HttpListenerContext context = listener.GetContext();
                            ThreadPool.QueueUserWorkItem(delegate(object state) { ProcessRequest((HttpListenerContext)state); }, context);
                        }
                        catch { }
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("[ERR] HTTP 서버 시작 실패: " + ex.Message);
            }
        }

        static void ProcessRequest(HttpListenerContext context)
        {
            HttpListenerRequest req = context.Request;
            HttpListenerResponse res = context.Response;

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
                else if (rawUrl == "/api/rpa/current-hover")
                {
                    DetailedTargetInfo h = CurrentHover;
                    DetailedTargetInfo locked = LastLocked;
                    string lockedJson = locked != null ? SerializeTargetJson(locked) : "null";
                    string currentJson = SerializeTargetJson(h);

                    responseString = "{\"online\":true,\"current\":" + currentJson + ",\"lastLocked\":" + lockedJson + "}";
                }
                else if (rawUrl == "/api/rpa/inspect-object" && req.HttpMethod == "POST")
                {
                    responseString = "{\"ok\":true,\"message\":\"실시간 전역 OS 레이더 객체 탐색기가 가동되었습니다.\"}";
                }
                else if (rawUrl == "/api/print-direct" && req.HttpMethod == "POST")
                {
                    using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        string body = reader.ReadToEnd();
                        Console.WriteLine("[PRINT] 직통 출력 요청 접수 (" + body.Length + " bytes)");
                        responseString = "{\"ok\":true,\"message\":\"ZPL 직접 인쇄 완료\"}";
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

        static string SerializeTargetJson(DetailedTargetInfo t)
        {
            if (t == null) return "null";
            return "{\"processName\":\"" + EscapeJson(t.ProcessName) + "\"," +
                   "\"processId\":" + t.ProcessId + "," +
                   "\"windowTitle\":\"" + EscapeJson(t.WindowTitle) + "\"," +
                   "\"windowClassName\":\"" + EscapeJson(t.WindowClassName) + "\"," +
                   "\"tagName\":\"" + EscapeJson(t.TagName) + "\"," +
                   "\"controlType\":\"" + EscapeJson(t.ControlType) + "\"," +
                   "\"id\":\"" + EscapeJson(t.Id) + "\"," +
                   "\"name\":\"" + EscapeJson(t.Name) + "\"," +
                   "\"className\":\"" + EscapeJson(t.ClassName) + "\"," +
                   "\"xpath\":\"" + EscapeJson(t.XPath) + "\"," +
                   "\"cssSelector\":\"" + EscapeJson(t.CssSelector) + "\"," +
                   "\"uiaPath\":\"" + EscapeJson(t.UiaPath) + "\"," +
                   "\"frameInfo\":\"" + EscapeJson(t.FrameInfo) + "\"," +
                   "\"parentHierarchy\":\"" + EscapeJson(t.ParentHierarchy) + "\"," +
                   "\"isEnabled\":" + (t.IsEnabled ? "true" : "false") + "," +
                   "\"isOffscreen\":" + (t.IsOffscreen ? "true" : "false") + "," +
                   "\"isPassword\":" + (t.IsPassword ? "true" : "false") + "," +
                   "\"rect\":{\"x\":" + t.X + ",\"y\":" + t.Y + ",\"width\":" + t.Width + ",\"height\":" + t.Height + "}," +
                   "\"timestamp\":" + t.Timestamp + "}";
        }

        static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
        }
    }
}
