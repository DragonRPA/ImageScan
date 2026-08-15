using System;
using Microsoft.Office.Interop.Excel;
using System.Runtime.InteropServices;
using System.Security.Cryptography.Pkcs;
using Label = System.Windows.Forms.Label;
using Excel = Microsoft.Office.Interop.Excel;
using System.Text;
using CheckBox = System.Windows.Forms.CheckBox;
using System.Security.Policy;
using System.Diagnostics;
using OpenQA.Selenium;
using OpenQA.Selenium.Edge;
using OpenQA.Selenium.Support.UI;
//using OpenQA.Selenium.Interactions;
using System.Xml.Linq;
using WindowsInput;
using WindowsInput.Native;
using System.Threading;
using Rectangle = System.Drawing.Rectangle;
using Keys = OpenQA.Selenium.Keys;
using InTheHand.Net.Sockets;
using InTheHand.Net.Bluetooth;
using InTheHand.Net;
//using Actions = OpenQA.Selenium.Interactions.Actions;
namespace UBUS
{
    public partial class Form1 : Form
    {

        List<자료형태> 자산목록 = new List<자료형태>();

        public int 출력반복;
        public struct 자료형태
        {
            public string 자산번호;
            public string 시리얼넘버;
            public string 발주번호;
            public string 선반번호;
            public string 관리번호;
            public string 자산상태;
            public string 내용연수;
            public string 잔존가치;
            public string 제품명;
            public string 모델명;
            public string 순번;
            public string 사용자;
            public string 부서;
            public string 옵션;
            public string 교정일자;
            public string 비고;
            public string 출고의뢰번호;
        }
        public const int 옵션_아이디 = 1;
        public const int 옵션_클래스네임 = 2;
        public const int 옵션_엑스패스 = 3;

        public Excel.Application excelApp = null;

        // 자산용 좌표
        public int 자산용_X { get; private set; }
        public int 자산용_Y { get; private set; }

        // 상품용 좌표
        public int 상품용_X { get; private set; }
        public int 상품용_Y { get; private set; }

        // 비품용 좌표
        public int 비품용_X { get; private set; }
        public int 비품용_Y { get; private set; }

        //ZD420D소형_X
        public int ZD420D소형QR_X { get; private set; }
        public int ZD420D소형QR_Y { get; private set; }

        public int ZD420D소형자산번호_X { get; private set; }
        public int ZD420D소형자산번호_Y { get; private set; }

        public int ZD420D소형자산번호크기 { get; private set; }

        public IWebElement 요소;
        public IList<IWebElement> 요소목록;
        public bool 로딩완료 = false;

        public string login_id;
        public string login_pw;


        public EdgeDriverService edgeDriverService = EdgeDriverService.CreateDefaultService();
        public IWebDriver driver;

        public string downloadPath = @"C:\downloads"; // 원하는 다운로드 경로 설정

        private string 자산용ZPL생성_대형(string 자산번호, string 제품명, string 모델명, string 시리얼)
        {
            string zpl = "^XA^MD21^BY2,2.0^FS^SEE:UHANGUL.DAT^FS^CW1,E:KFONT3.FNT^CI26^FS";
            zpl = zpl + $"^FO{자산용_X + 20},{자산용_Y + 55}^A1,30,30^FD자산번호 {자산번호}^FS";
            if (제품명출력.Checked)
            {
                zpl = zpl + $"^FO{자산용_X + 20},{자산용_Y + 100}^A1N,30,30^FD제품명 {제품명}^FS";
            }
            zpl = zpl + $"^FO{자산용_X + 20},{자산용_Y + 145}^A0N,30,30^FDM/N {모델명}^FS";
            zpl = zpl + $"^FO{자산용_X + 20},{자산용_Y + 190}^A0N,30,30^FDS/N {시리얼}^FS";
            // 프린터선택 의 선택된 아이템의 값이 "ZDesigner ZT411-203dpi ZPL" 이면
            if (프린터선택.Text == "ZDesigner ZT411-203dpi ZPL")
            {
                zpl = zpl + $"^FO{자산용_X + 340},{자산용_Y + 52}^BCN,50,N^FD{자산번호}^FS";
            }
            else
            {
                zpl = zpl + $"^FO{자산용_X + 20},{자산용_Y + 220}^BCN,50,N^FD{자산번호}^FS";
            }
            zpl = zpl + $"^XZ";
            return zpl;
        }
        private string 자산용ZPL생성_소형(string 자산번호)
        {
            string zpl = "^XA^MD21";
            zpl = zpl + $"^FO{ZD420D소형QR_X + 240},{ZD420D소형QR_Y + 15}^BQN,2,3^FDLA,{자산번호}^FS";
            zpl = zpl + $"^FO{ZD420D소형자산번호_X + 225},{ZD420D소형자산번호_Y + 95}^A1,{ZD420D소형자산번호크기},{ZD420D소형자산번호크기}^FD{자산번호}^FS";
            zpl = zpl + $"^XZ";
            return zpl;
        }
        private string 비품용ZPL생성(string 관리번호, string 모델명, string 시리얼, string 사용자, string 부서)  // 비품용
        {
            string zpl = "^XA^MD21^BY2,2.0^FS^SEE:UHANGUL.DAT^FS^CW1,E:KFONT3.FNT^CI26^FS";
            zpl = zpl + $"^FO{비품용_X + 450},{비품용_Y + 30}^BQN,2,3^A1,100,100^FD_{관리번호}_{모델명}_{시리얼}_^FS";   // 4번째 값이 H,Q,M,L 순
            zpl = zpl + $"^FO{비품용_X + 15},{비품용_Y + 55}^A1,35,35^FD관리번호 {관리번호}^FS";
            zpl = zpl + $"^FO{비품용_X + 15},{비품용_Y + 90}^A1,30,30^FD모델명  {모델명}^FS";
            zpl = zpl + $"^FO{비품용_X + 15},{비품용_Y + 135}^A1,30,30^FD사용자 {사용자}^FS";
            zpl = zpl + $"^FO{비품용_X + 15},{비품용_Y + 175}^A1,30,30^FD부서 {부서}^FS";
            zpl = zpl + $"^FO{비품용_X + 15},{비품용_Y + 210}^A1,28,28^FDSN  {시리얼}^FS";
            zpl = zpl + $"^XZ";
            return zpl;
        }
        private string 상품용ZPL생성(string 순번, string 모델명, string 시리얼)  // 상품용
        {
            string zpl = "^XA^MD21^BY2,2.0^FS^SEE:UHANGUL.DAT^FS^CW1,E:KFONT3.FNT^CI26^FS";

            zpl = zpl + $"^FO{상품용_X + 200},{상품용_Y + 140}^BQN,2,4^A1,100,100^FD_{순번}_{모델명}_{시리얼}^FS";   // 4번째 값이 H,Q,M,L 순
            zpl = zpl + $"^FO{상품용_X + 20},{상품용_Y + 70}^A1,28,28^FD MODEL : {모델명}^FS";
            zpl = zpl + $"^FO{상품용_X + 20},{상품용_Y + 100}^A1,28,28^FD SN : {시리얼}^FS";
            if (순번출력.Checked)
            {
                zpl = zpl + $"^FO{상품용_X + 400},{상품용_Y + 30}^A1,28,28^FD 순번 : {순번}^FS";
            }
            zpl = zpl + $"^FO{상품용_X + 25},{상품용_Y + 30}^A1,28,28^FD {관리구분.Text}^FS";
            zpl = zpl + $"^XZ";
            return zpl;
        }
        private void 라벨출력(string zpl)
        {
            //라벨 출력 명령
            string PrinterName = 프린터선택.Text.Replace("-대형", "").Replace("-소형", "");
            //MessageBox.Show(PrinterName);

            // 경로가 없으면 생성
            if (!Directory.Exists(@"C:\BarCodePrinter"))
            {
                Directory.CreateDirectory(@"C:\BarCodePrinter");
            }
            string FilePath = @"C:\BarCodePrinter\print.txt";

            //create a text file, writes the contents with ansi encoding and closes the file.
            // ANSI 인코딩으로 파일 생성
            using (FileStream fs = new FileStream(FilePath, FileMode.Create, FileAccess.Write))
            {
                // Encoding 949를 등록
                Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
                // ansi encoding
                using (StreamWriter sw = new StreamWriter(fs, Encoding.GetEncoding(949))) // GetEncoding(949)
                {
                    sw.Write(zpl);
                }
            }

            //RawPrinterHelper.SendStringToPrinter(PrinterName, LabelContents);
            for (int i = 0; i < int.Parse(출력매수.Text); i++)
            {
                RawPrinterHelper.SendFileToPrinter(PrinterName, FilePath);
            }
            // sw, fs를 파괴
        }

        static bool 로딩완료확인(IWebDriver driver, int 밀리초)
        {
            Thread.Sleep(밀리초);
            // 명시적 대기를 통해 페이지가 완전히 로드될 때까지 기다림
            WebDriverWait wait = new WebDriverWait(driver, TimeSpan.FromSeconds(600));
            return wait.Until(drv =>
            {
                return ((IJavaScriptExecutor)drv).ExecuteScript("return document.readyState").ToString() == "complete";
            });
        }
        // 탭 선택 이벤트 핸들러
        // 탭이 그려질 때 호출되는 이벤트 핸들러
        private void TabControl_DrawItem(object sender, DrawItemEventArgs e)
        {
            TabPage tabPage = tabControl.TabPages[e.Index];
            Rectangle tabRect = tabControl.GetTabRect(e.Index);

            // 선택된 탭이면 텍스트 색을 빨간색으로 설정
            if (e.Index == tabControl.SelectedIndex)
            {
                e.Graphics.DrawString(tabPage.Text, e.Font, Brushes.Red, tabRect.X + 2, tabRect.Y + 2);
            }
            else
            {
                // 선택되지 않은 탭이면 텍스트 색을 검정색으로 설정
                e.Graphics.DrawString(tabPage.Text, e.Font, Brushes.Black, tabRect.X + 2, tabRect.Y + 2);
            }
        }

        private IWebElement 프레임전환(IWebDriver 드라이버, string 프레임아이디, bool 될때까지대기)
        {
            bool 로딩대기 = false;
            로딩대기 = 로딩완료확인(드라이버, 100);

            // Wait 객체 생성
            WebDriverWait wait = new WebDriverWait(드라이버, TimeSpan.FromSeconds(10)); // 최대 10초 대기
            IWebElement 찾을프레임 = null;
            try
            {
                if (!될때까지대기)   // 단발성으로 처리할 경우
                {
                    찾을프레임 = 드라이버.FindElement(By.Id(프레임아이디));
                    if (찾을프레임 == null)
                    {
                        //MessageBox.Show($"프레임을 찾을 수 없습니다: {프레임아이디}");
                        return null;
                    }

                    드라이버.SwitchTo().Frame(찾을프레임);
                    //MessageBox.Show($"프레임전환 : {프레임아이디}");
                    return 찾을프레임;
                }

                // 될 때까지 대기
                찾을프레임 = wait.Until(drv => drv.FindElement(By.Id(프레임아이디)));
                드라이버.SwitchTo().Frame(찾을프레임);
                //MessageBox.Show($"프레임전환 : {프레임아이디}");
                return 찾을프레임;
            }
            catch (NoSuchElementException)
            {
                //MessageBox.Show($"프레임을 찾지 못했습니다: {프레임아이디}");
                return null;
            }
            catch (WebDriverTimeoutException)
            {
                //MessageBox.Show($"프레임 로딩이 시간 안에 완료되지 않았습니다: {프레임아이디}");
                return null;
            }
            catch (Exception ex)
            {
                //MessageBox.Show($"예외 발생: {ex.Message}");
                return null;
            }
        }
        private IWebElement 요소찾기(IWebDriver 드라이버, int 옵션, string 찾을조건)
        {

            요소 = null;
            bool 로딩완료 = false;
            로딩완료 = 로딩완료확인(driver, 100);
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(0.1);
            int 반복횟수 = 0;
            while (요소 == null)
            {
                반복횟수++;
                if (반복횟수 > 30)
                {
                    MessageBox.Show($"요소찾기 오류 : {찾을조건}");
                    반복횟수 = 0;
                }
                try
                {
                    switch (옵션)
                    {
                        case 옵션_아이디:
                            요소 = driver.FindElement(By.Id(찾을조건));
                            return 요소;
                        case 옵션_클래스네임:
                            요소 = driver.FindElement(By.ClassName(찾을조건));
                            return 요소;
                        case 옵션_엑스패스:
                            요소 = driver.FindElement(By.XPath(찾을조건));
                            return 요소;
                        default:
                            break;
                    }
                }
                catch (Exception ex) { }

                Thread.Sleep(300);

            }
            return 요소;
        }
        private IList<IWebElement> 요소목록찾기(IWebDriver 드라이버, int 옵션, string 찾을조건)
        {

            // 요소목록 정의
            요소목록 = null;
            bool 로딩완료 = false;
            로딩완료 = 로딩완료확인(driver, 100);
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(0.1);
            int 반복횟수 = 0;
            while (요소목록 == null)
            {
                반복횟수++;
                if (반복횟수 > 30)
                {
                    MessageBox.Show($"요소찾기 오류 : {찾을조건}");
                    반복횟수 = 0;
                }
                try
                {
                    switch (옵션)
                    {
                        case 옵션_아이디:
                            요소목록 = driver.FindElements(By.Id(찾을조건));
                            break;
                        case 옵션_클래스네임:
                            요소목록 = driver.FindElements(By.ClassName(찾을조건));
                            break;
                        case 옵션_엑스패스:
                            요소목록 = driver.FindElements(By.XPath(찾을조건));
                            break;
                        default:
                            break;
                    }
                }
                catch (Exception ex) { }

                Thread.Sleep(100);
            }
            return 요소목록;
        }
        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            Size 창크기 = this.Size;

            this.MaximumSize = 창크기;
            this.MinimumSize = 창크기;

            프린터선택.Items.Add("ZDesigner ZT411-203dpi ZPL");
            프린터선택.Items.Add("ZDesigner GK420D-소형");
            프린터선택.Items.Add("ZDesigner GK420D-대형");


            오프셋읽기();
            //MessageBox.Show(자산용_X.ToString());
            // 바탕화면에 "자산목록.xlsx" 파일의 존재여부 확인
            string 바탕화면 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string 파일경로 = 바탕화면 + @"\자산목록.xlsx";

            if (File.Exists(파일경로))
            {
                자산목록 = 엑셀파일읽기(파일경로);
            }
            else
            {
                // 파일이 없으면 경고창 띄우기
                MessageBox.Show("바탕화면에 자산목록.xlsx 파일이 없습니다.");
            }


        }

        private void 오프셋읽기()
        {
            foreach (var 줄 in File.ReadLines(@"C:\BarCodePrinter\offset.txt")) // 파일을 한 줄씩 읽음
            {
                var 부분 = 줄.Split(new[] { ":" }, StringSplitOptions.RemoveEmptyEntries); // ": " 기준으로 키와 값 분리
                if (부분.Length != 2) continue; // 데이터가 두 부분(키, 값)으로 나뉘지 않으면 무시

                string 키 = 부분[0].Trim(); // 좌표 이름
                if (int.TryParse(부분[1].Trim(), out int 값)) // 숫자로 변환 가능한 경우만 처리
                {
                    // 키 값에 따라 적절한 변수에 저장
                    switch (키)
                    {
                        case "자산용 x": 자산용_X = 값; break;
                        case "자산용 y": 자산용_Y = 값; break;
                        case "상품용 x": 상품용_X = 값; break;
                        case "상품용 y": 상품용_Y = 값; break;
                        case "비품용 x": 비품용_X = 값; break;
                        case "비품용 y": 비품용_Y = 값; break;
                        case "ZD420D 소형 QR x": ZD420D소형QR_X = 값; break;
                        case "ZD420D 소형 QR y": ZD420D소형QR_Y = 값; break;
                        case "ZD420D 소형 자산번호 x": ZD420D소형자산번호_X = 값; break;
                        case "ZD420D 소형 자산번호 y": ZD420D소형자산번호_Y = 값; break;
                        case "ZD420D 소형 자산번호크기": ZD420D소형자산번호크기 = 값; break;
                    }
                }
            }


            return;
        }



        static void PairBluetoothDevice(string manufactureNumber)
        {
            // Bluetooth 장치 페어링을 위해 사용자가 수동으로 페어링해야 할 수 있습니다.
            // 하지만, 일반적으로 Bluetooth 장치 페어링은 Windows의 설정이나
            // Bluetooth 관련 API를 통해 이루어집니다.

            // 아래는 페어링을 위한 기본적인 방법입니다. 사용자 환경에 따라 달라질 수 있습니다.
            Console.WriteLine("새로운 Bluetooth 장치를 페어링 중입니다. 제조번호: " + manufactureNumber);
            Thread.Sleep(3000); // 3초 대기
            Console.WriteLine("페어링이 완료되었습니다.");
        }
        private void TabPage1_DragEnter(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effect = DragDropEffects.Copy; // 파일 드래그 시 커서 모양 변경
            }
            else
            {
                e.Effect = DragDropEffects.None; // 드래그가 불가능한 경우
            }
        }
        private void TabPage2_DragEnter(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effect = DragDropEffects.Copy; // 파일 드래그 시 커서 모양 변경
            }
            else
            {
                e.Effect = DragDropEffects.None; // 드래그가 불가능한 경우
            }
        }
        private void TabPage3_DragEnter(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effect = DragDropEffects.Copy; // 파일 드래그 시 커서 모양 변경
            }
            else
            {
                e.Effect = DragDropEffects.None; // 드래그가 불가능한 경우
            }
        }
        private void TabPage4_DragEnter(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effect = DragDropEffects.Copy; // 파일 드래그 시 커서 모양 변경
            }
            else
            {
                e.Effect = DragDropEffects.None; // 드래그가 불가능한 경우
            }
        }
        private void TabPage5_DragEnter(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effect = DragDropEffects.Copy; // 파일 드래그 시 커서 모양 변경
            }
            else
            {
                e.Effect = DragDropEffects.None; // 드래그가 불가능한 경우
            }
        }



        private void 엑셀파일일괄출력_DragEnter(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effect = DragDropEffects.Copy; // 파일 드래그 시 커서 모양 변경
            }
            else
            {
                e.Effect = DragDropEffects.None; // 드래그가 불가능한 경우
            }
        }
        // DragDrop 이벤트 핸들러
        private void 엑셀파일일괄출력_DragDrop(object sender, DragEventArgs e)
        {
            // 드래그 앤 드롭된 파일의 경로를 가져옵니다.
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files.Length > 1)
            {
                MessageBox.Show("파일을 하나만 넣어주세요.");
                return;
            }

            string 파일경로 = files[0];
            List<자료형태> 엑셀 = 엑셀파일읽기(파일경로);

            foreach (자료형태 자료 in 엑셀)
            {
                if (렌탈자산용.Checked)
                {
                    if (프린터선택.Text == "ZDesigner GK420D-대형" || 프린터선택.Text == "ZDesigner ZT411-203dpi ZPL")
                    {
                        라벨출력(자산용ZPL생성_대형(자료.자산번호, 자료.제품명, 자료.모델명.ToUpper(), 자료.시리얼넘버.ToUpper()));
                    }
                    if (프린터선택.Text == "ZDesigner GK420D-소형")
                    {
                        라벨출력(자산용ZPL생성_소형(자료.자산번호));
                    }
                }
                else if (비품용.Checked)
                {
                    if (프린터선택.Text != "ZDesigner GK420D-소형")
                    {
                        라벨출력(비품용ZPL생성(자료.관리번호, 자료.모델명.ToUpper(), 자료.시리얼넘버.ToUpper(), 자료.사용자, 자료.부서));
                    }

                }
                else if (상품용.Checked)
                {
                    if (프린터선택.Text != "ZDesigner GK420D-소형")
                    {
                        라벨출력(상품용ZPL생성(자료.순번, 자료.모델명.ToUpper(), 자료.시리얼넘버.ToUpper()));
                    }
                }
            }

        }




        private void 실행기능_입고등록(object sender, DragEventArgs e)    // 입고등록
        {
            // 드래그 앤 드롭된 파일의 경로를 가져옵니다.
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files.Length > 1)
            {
                MessageBox.Show("파일을 하나만 넣어주세요.");
                return;
            }

            string 파일경로 = files[0];
            List<자료형태> 엑셀 = 엑셀파일읽기(파일경로);


            login_id = "shlee0105";
            login_pw = "1111";
            bool 로그인완료 = 로그인(login_id, login_pw);
            if (로그인완료 == false) { MessageBox.Show("로그인 실패"); return; }


            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[contains(@class, 'ps-menu-label') and text()='입고']");     // 입고
            요소.Click();
            // "//span[contains(@class, 'm-lg-3') and text()='입고등록']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[contains(@class, 'm-lg-3') and text()='입고등록']");     // 입고등록
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);


            foreach (자료형태 자료 in 엑셀)
            {
                로딩완료 = 로딩완료확인(driver, 300);
                요소 = 요소찾기(driver, 옵션_엑스패스, "//input[contains(@class, 'form-control')]");

                if (자료.자산번호 != "")
                {
                    요소.SendKeys(자료.자산번호);
                }
                else if (자료.시리얼넘버 != "")
                {
                    요소.SendKeys(자료.시리얼넘버);
                }
                요소.SendKeys(OpenQA.Selenium.Keys.Enter);
                로딩완료 = 로딩완료확인(driver, 300);

            }

            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[contains(@class, 'btn-success') and contains(@class, 'btn-sm')]");
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[contains(@class, 'alert-confirm-button') and contains(@class, 'primary-button')]");
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);
            driver.Quit();
        }

        private void 실행기능_자산정보수정(object sender, DragEventArgs e)
        {
            // 드래그 앤 드롭된 파일의 경로를 가져옵니다.
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files.Length > 1)
            {
                MessageBox.Show("파일을 하나만 넣어주세요.");
                return;
            }

            string 파일경로 = files[0];
            List<자료형태> 엑셀 = 엑셀파일읽기(파일경로);

            login_id = "shlee0105";
            login_pw = "1111";

            bool 로그인완료 = 로그인(login_id, login_pw);
            if (로그인완료 == false) { MessageBox.Show("로그인 실패"); return; }


            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[@class='ps-menu-label css-12w9als' and text()='자산']");     // 자산
            요소.Click();
            // "//span[contains(@class, 'm-lg-3') and text()='입고등록']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[@class='m-lg-3' and text()='자산조회']");     // 자산조회
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            var radioButton = driver.FindElement(By.Id("exceptNotRental-0"));
            radioButton.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            foreach (자료형태 자료 in 엑셀)
            {
                bool 시리얼입력 = false;
                if (자료.자산번호 == "" && 자료.시리얼넘버 == "") { continue; }

                if (자료.자산번호 != "")
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@aria-describedby='assetNo']");
                    요소.Clear();
                    요소.SendKeys(자료.자산번호);
                    요소.SendKeys(OpenQA.Selenium.Keys.Enter);
                    로딩완료 = 로딩완료확인(driver, 300);
                    요소 = 요소찾기(driver, 옵션_엑스패스, $"//span[contains(@id, 'cell-assetNo-') and contains(@class, 'ag-cell-value') and text()='{자료.자산번호}']");  // 조회결과 첫행
                }
                else if (자료.시리얼넘버 != "")
                {
                    시리얼입력 = true;
                    요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@aria-describedby='serialNo']");
                    요소.Clear();
                    요소.SendKeys(자료.시리얼넘버);
                    요소.SendKeys(OpenQA.Selenium.Keys.Enter);
                    로딩완료 = 로딩완료확인(driver, 300);
                    요소 = 요소찾기(driver, 옵션_엑스패스, $"//span[contains(@id, 'cell-serialNo-') and contains(@class, 'ag-cell-value') and text()='{자료.시리얼넘버}']");  // 조회결과 첫행
                }

                IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
                js.ExecuteScript("var event = new MouseEvent('dblclick', { bubbles: true, cancelable: true }); arguments[0].dispatchEvent(event);", 요소);
                Thread.Sleep(500);
                
                IWebElement element = null;
                string cssSelector = $"input[aria-describedby='assetNo'][value='{자료.자산번호}']";
                while (element == null)
                {
                    try
                    {
                        element = driver.FindElement(By.CssSelector(cssSelector));
                        string value = element.GetAttribute("value");
                        if (value == 자료.자산번호)
                        {
                            Thread.Sleep(7000);
                            break; // 루프 종료
                        }
                        else
                        {
                            element = null;
                        }
                    }
                    catch (NoSuchElementException)
                    {
                        Thread.Sleep(200); // 0.2초 대기
                    }
                }
                
                if (자료.시리얼넘버 != "" && 시리얼입력 == false)
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "(//input[@type='input'])[15]");  // 시리얼넘버
                    요소.Clear();
                    로딩완료 = 로딩완료확인(driver, 300);
                    요소.Clear();
                    요소.SendKeys(자료.시리얼넘버);
                    로딩완료 = 로딩완료확인(driver, 100);
                }

                if (자료.옵션 != "")  // ok
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "(//input[@type='input'])[17]");  // 옵션
                    요소.Clear();
                    로딩완료 = 로딩완료확인(driver, 300);
                    요소.Clear();
                    요소.SendKeys(자료.옵션);
                    로딩완료 = 로딩완료확인(driver, 100);
                }
                if (자료.선반번호 != "")
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "(//input[@type='input'])[31]");  // 선반번호
                    요소.Clear();
                    로딩완료 = 로딩완료확인(driver, 300);
                    요소.Clear();
                    요소.SendKeys(자료.선반번호);
                    로딩완료 = 로딩완료확인(driver, 100);
                }
                if (자료.비고 != "")  // ok
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "(//input[@type='input'])[35]");  // 비고
                    요소.Clear();
                    로딩완료 = 로딩완료확인(driver, 300);
                    요소.Clear();
                    요소.SendKeys(자료.비고);
                    로딩완료 = 로딩완료확인(driver, 100);
                }


                if (자료.교정일자 != "")
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "\"//input[@type='text' and @placeholder='YYYY-MM-DD']");
                    //요소 = 요소찾기(driver, 옵션_엑스패스, "(//input[@type='input'])[3]");  // 비고
                    요소.Clear();
                    요소.SendKeys(자료.교정일자);
                    로딩완료 = 로딩완료확인(driver, 100);
                    string 성적서경로1 = $@"Z:\측정기교정성적서\{자료.시리얼넘버}_{자료.교정일자}.pdf";
                    string 성적서경로2 = $@"Z:\측정기교정성적서\{자료.시리얼넘버}_{자료.교정일자}.jpg";
                    // 파일존재 확인
                    bool 파일존재확인1 = System.IO.File.Exists(성적서경로1);
                    bool 파일존재확인2 = System.IO.File.Exists(성적서경로2);

                    if (파일존재확인1)   // 돋보기 "//i[@class='fi fi-rr-search' and @style='padding-top: 8px; cursor: pointer;']"
                    {
                        try
                        {
                            요소 = driver.FindElement(By.XPath("//i[@class='fi fi-rr-search' and @style='padding-top: 8px; cursor: pointer;']"));
                            요소.Click();
                        }
                        catch (Exception ex) { }


                        요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@id='profileImg' and @class='form-control form-control-sm']");
                        요소.SendKeys(성적서경로1);
                    }
                    if (파일존재확인2)
                    {
                        try
                        {
                            요소 = driver.FindElement(By.XPath("//i[@class='fi fi-rr-search' and @style='padding-top: 8px; cursor: pointer;']"));
                            요소.Click();
                        }
                        catch (Exception ex) { }
                        요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@id='profileImg' and @class='form-control form-control-sm']");
                        요소.SendKeys(성적서경로2);
                    }
                }

                요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and contains(@class, 'btn-success') and text()='수정']");
                요소.Click();
                로딩완료 = 로딩완료확인(driver, 300);
                요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@class='alert-confirm-button primary-button' and text()='OK']");
                요소.Click();

                로딩완료 = 로딩완료확인(driver, 300);
                요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@class='btn-close btn-close-white' and @aria-label='Close']");
                요소.Click();
                로딩완료 = 로딩완료확인(driver, 300);
            }


            driver.Quit();
        }
        private void 실행기능_출고검수_원본(object sender, DragEventArgs e)
        {
            // 드래그 앤 드롭된 파일의 경로를 가져옵니다.
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files.Length > 1)
            {
                MessageBox.Show("파일을 하나만 넣어주세요.");
                return;
            }

            string 파일경로 = files[0];
            List<자료형태> 엑셀 = 엑셀파일읽기(파일경로);

            login_id = "shlee0105";
            login_pw = "1111";
            bool 로그인완료 = 로그인(login_id, login_pw);
            if (로그인완료 == false) { MessageBox.Show("로그인 실패"); return; }


            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[@class='ps-menu-label css-12w9als' and text()='출고']");     // 출고
            요소.Click();
            // "//span[contains(@class, 'm-lg-3') and text()='입고등록']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[@class='m-lg-3' and text()='출고의뢰']");     // 출고의뢰
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            var buttons = driver.FindElements(By.CssSelector("button.text-gray-400"));
            if (buttons.Count > 0)
            {
                buttons[0].Click(); // 첫 번째 요소 클릭
            }
            else
            {
                Console.WriteLine("버튼 요소를 찾을 수 없습니다.");
            }



            요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@aria-describedby='releaseAskSeq' and @class='form-control']");     // 출고의뢰번호
            요소.SendKeys(엑셀[0].출고의뢰번호);
            요소.SendKeys(OpenQA.Selenium.Keys.Return);
            로딩완료 = 로딩완료확인(driver, 300);

            요소 = 요소찾기(driver, 옵션_엑스패스, $"//span[contains(@id, 'cell-releaseAskSeq-') and contains(@class, 'ag-cell-value') and text()='{엑셀[0].출고의뢰번호}']");  // 조회결과 첫행
            // JavaScript를 사용하여 더블클릭 이벤트 발생
            IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
            js.ExecuteScript("var event = new MouseEvent('dblclick', { bubbles: true, cancelable: true }); arguments[0].dispatchEvent(event);", 요소);
            로딩완료 = 로딩완료확인(driver, 1500);

            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and contains(@class, 'btn-secondary') and contains(@class, 'btn-sm') and span[text()='자산검수']]");     // 자산검수버튼
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 1500);


            요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@type='input' and @aria-describedby='inputNo' and contains(@class, 'form-control')]");     // 자산검수 입력란
            로딩완료 = 로딩완료확인(driver, 100);

            foreach (자료형태 자료 in 엑셀)
            {
                string 입력 = "";
                if (자료.자산번호 == "") { 입력 = 자료.시리얼넘버; } else { 입력 = 자료.자산번호; }
                요소.SendKeys(입력);
                요소.SendKeys(OpenQA.Selenium.Keys.Enter);
                로딩완료 = 로딩완료확인(driver, 300);
            }

            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and contains(@class, 'btn-success') and contains(text(), '검수완료')]");     // 자산검수 입력란
            요소.Click();

            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and @class='alert-confirm-button primary-button' and text()='OK']");     // 자산검수 입력란
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 2000);

            driver.Quit();
        }


        private void 출고검수화면세팅(string 출고의뢰번호)
        {

            login_id = "shlee0105";
            login_pw = "1111";
            bool 로그인완료 = 로그인(login_id, login_pw);
            if (로그인완료 == false) { MessageBox.Show("로그인 실패"); return; }


            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[@class='ps-menu-label css-12w9als' and text()='출고']");     // 출고
            요소.Click();
            // "//span[contains(@class, 'm-lg-3') and text()='입고등록']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[@class='m-lg-3' and text()='출고의뢰']");     // 출고의뢰
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            var buttons = driver.FindElements(By.CssSelector("button.text-gray-400"));
            if (buttons.Count > 0)
            {
                buttons[0].Click(); // 첫 번째 요소 클릭
            }
            else
            {
                Console.WriteLine("버튼 요소를 찾을 수 없습니다.");
            }



            요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@aria-describedby='releaseAskSeq' and @class='form-control']");     // 출고의뢰번호
            요소.SendKeys(출고의뢰번호);
            요소.SendKeys(OpenQA.Selenium.Keys.Return);
            로딩완료 = 로딩완료확인(driver, 300);

            요소 = 요소찾기(driver, 옵션_엑스패스, $"//span[contains(@id, 'cell-releaseAskSeq-') and contains(@class, 'ag-cell-value') and text()='{출고의뢰번호}']");  // 조회결과 첫행
            // JavaScript를 사용하여 더블클릭 이벤트 발생
            IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
            js.ExecuteScript("var event = new MouseEvent('dblclick', { bubbles: true, cancelable: true }); arguments[0].dispatchEvent(event);", 요소);
            로딩완료 = 로딩완료확인(driver, 1500);

            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and contains(@class, 'btn-secondary') and contains(@class, 'btn-sm') and span[text()='자산검수']]");     // 자산검수버튼
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 1500);


            요소 = 요소찾기(driver, 옵션_엑스패스, "//input[@type='input' and @aria-describedby='inputNo' and contains(@class, 'form-control')]");     // 자산검수 입력란
            로딩완료 = 로딩완료확인(driver, 100);


            return;
        }

        private void 실행기능_출고검수(object sender, DragEventArgs e)
        {
            // 드래그 앤 드롭된 파일의 경로를 가져옵니다.
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files.Length > 1)
            {
                MessageBox.Show("파일을 하나만 넣어주세요.");
                return;
            }

            string 파일경로 = files[0];
            List<자료형태> 엑셀 = 엑셀파일읽기(파일경로);

            출고검수화면세팅(엑셀[0].출고의뢰번호);

            int 검수입력반복횟수 = 0;
            int 초기화카운트 = 0;
            foreach (자료형태 자료 in 엑셀)
            {
                검수입력반복횟수++;
                초기화카운트++;
                string 입력 = "";
                if (자료.자산번호 == "") { 입력 = 자료.시리얼넘버; } else { 입력 = 자료.자산번호; }
                요소.SendKeys(입력);
                요소.SendKeys(OpenQA.Selenium.Keys.Enter);
                로딩완료 = 로딩완료확인(driver, 300);

                if (초기화카운트 == 100 || 검수입력반복횟수 == 엑셀.Count)
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and contains(@class, 'btn-success') and contains(text(), '검수완료')]");     // 자산검수 입력란
                    요소.Click();

                    요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and @class='alert-confirm-button primary-button' and text()='OK']");     // 자산검수 입력란
                    요소.Click();
                    로딩완료 = 로딩완료확인(driver, 2000);
                    try
                    {
                        driver.Quit();
                    }
                    catch { }
                    if (검수입력반복횟수 != 엑셀.Count)
                    {
                        Thread.Sleep(1500);
                        출고검수화면세팅(엑셀[0].출고의뢰번호);
                        초기화카운트 = 0;
                    }
                    
                }

            }
            // 현재시간이 18시 이후이고 자동종료가  true 이면 PC 를 자동종료함
            if ((DateTime.Now.Hour >= 18 || DateTime.Now.Hour <= 08 ) && 종료예약.Checked)
            {
                Process.Start("shutdown", "/s /t 0");
            }
        }

        private void 실행기능_출고검수_테스트(object sender, DragEventArgs e)
        {
            // 드래그 앤 드롭된 파일의 경로를 가져옵니다.
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files.Length > 1)
            {
                MessageBox.Show("파일을 하나만 넣어주세요.");
                return;
            }

            string 파일경로 = files[0];
            List<자료형태> 엑셀 = 엑셀파일읽기(파일경로);

            출고검수화면세팅(엑셀[0].출고의뢰번호);


            int 검수입력반복횟수 = 0;
            int 초기화카운트 = 0;
            foreach (자료형태 자료 in 엑셀)
            {
                검수입력반복횟수++;
                초기화카운트++;
                string 입력 = "";
                if (자료.자산번호 == "") { 입력 = 자료.시리얼넘버; } else { 입력 = 자료.자산번호; }
                요소.SendKeys(입력);
                요소.SendKeys(OpenQA.Selenium.Keys.Enter);
                로딩완료 = 로딩완료확인(driver, 300);

                if (초기화카운트 == 100 || 검수입력반복횟수 == 엑셀.Count)
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and contains(@class, 'btn-success') and contains(text(), '검수완료')]");     // 자산검수 입력란
                    요소.Click();

                    요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@type='button' and @class='alert-confirm-button primary-button' and text()='OK']");     // 자산검수 입력란
                    요소.Click();
                    로딩완료 = 로딩완료확인(driver, 2000);
                    try
                    {
                        driver.Quit();
                    }
                    catch { }
                    if (검수입력반복횟수 != 엑셀.Count)
                    {
                        Thread.Sleep(1500);
                        출고검수화면세팅(엑셀[0].출고의뢰번호);
                        초기화카운트 = 0;
                    }

                }

            }
            // 현재시간이 18시 이후이고 자동종료가  true 이면 PC 를 자동종료함
            if ((DateTime.Now.Hour >= 18 || DateTime.Now.Hour <= 08) && 종료예약.Checked)
            {
                Process.Start("shutdown", "/s /t 0");
            }
        }


        private void TabPage5_DragDrop(object sender, DragEventArgs e)
        {
            MessageBox.Show("현재 지원하지 않는 기능입니다.");
        }


        public List<자료형태> 엑셀파일읽기(string filePath)
        {
            bool 파일존재확인 = System.IO.File.Exists(filePath);
            if (파일존재확인 == false) { MessageBox.Show($"{filePath} 파일이 존재하지 않습니다."); return null; }

            excelApp = null;
            while (excelApp == null)
            {
                try { excelApp = new Excel.Application(); }
                catch (Exception ex) { }
            }

            List<자료형태> 반환자료 = new List<자료형태>();
            Workbook workbook = null;
            try { workbook = excelApp.Workbooks.Open(filePath); }
            catch (Exception ex) { MessageBox.Show(ex.Message); return null; }

            Worksheet worksheet = workbook.Sheets[1];
            object[,] 데이터 = worksheet.UsedRange.Value;
            workbook.Close();

            System.Runtime.InteropServices.Marshal.ReleaseComObject(workbook);

            // 필요한 헤더들
            List<string> 필요항목들 = new List<string> { "자산번호", "시리얼넘버", "시리얼번호", "시리얼", "제조번호", "SN", "S/N", "선반번호", "관리번호", "자산상태",
                                                        "발주번호", "내용연수", "잔존가치", "모델명", "제품명", "순번", "사용자", "부서", "비고", "옵션", "출고의뢰번호" };
            int 행수 = 데이터.GetLength(0);
            int 열수 = 데이터.GetLength(1);
            List<int> 열목록 = new List<int>();
            string 데이터값;
            for (int 열 = 1; 열 <= 열수; 열++)
            {
                if (데이터[1, 열] == null) { continue; }
                데이터값 = 데이터[1, 열].ToString().Replace("\r", "").Replace("\n", "").Replace(Environment.NewLine, "").Trim();
                데이터[1, 열] = 데이터값;
                foreach (string 필요항목 in 필요항목들)
                {
                    if (데이터[1, 열].ToString() == 필요항목)
                    {
                        열목록.Add(열);
                        break;
                    }
                }
            }

            for (int 행 = 2; 행 <= 행수; 행++)
            {
                자료형태 현재행 = new 자료형태();
                현재행.자산번호 = "";
                현재행.시리얼넘버 = "";
                현재행.발주번호 = "";
                현재행.선반번호 = "";
                현재행.관리번호 = "";
                현재행.자산상태 = "";
                현재행.내용연수 = "";
                현재행.잔존가치 = "";
                현재행.모델명 = "";
                현재행.제품명 = "";
                현재행.순번 = "";
                현재행.사용자 = "";
                현재행.부서 = "";
                현재행.옵션 = "";
                현재행.교정일자 = "";
                현재행.비고 = "";
                현재행.출고의뢰번호 = "";



                foreach (int 열 in 열목록)
                {
                    if (데이터[행, 열] == null) { continue; }
                    데이터값 = 데이터[행, 열].ToString().Replace("\r", "").Replace("\n", "").Replace(Environment.NewLine, "").Trim();
                    데이터[행, 열] = 데이터값;
                    switch (데이터[1, 열].ToString())
                    {
                        case "자산번호": 현재행.자산번호 = 데이터값; break;
                        case "시리얼넘버": 현재행.시리얼넘버 = 데이터값; break;
                        case "시리얼번호": 현재행.시리얼넘버 = 데이터값; break;
                        case "시리얼": 현재행.시리얼넘버 = 데이터값; break;
                        case "제조번호": 현재행.시리얼넘버 = 데이터값; break;
                        case "SN": 현재행.시리얼넘버 = 데이터값; break;
                        case "S/N": 현재행.시리얼넘버 = 데이터값; break;
                        case "발주번호": 현재행.발주번호 = 데이터값; break;
                        case "선반번호": 현재행.선반번호 = 데이터값; break;
                        case "관리번호": 현재행.관리번호 = 데이터값; break;
                        case "자산상태": 현재행.자산상태 = 데이터값; break;
                        case "내용연수": 현재행.내용연수 = 데이터값; break;
                        case "잔존가치": 현재행.잔존가치 = 데이터값; break;
                        case "모델명": 현재행.모델명 = 데이터값; break;
                        case "제품명": 현재행.제품명 = 데이터값; break;
                        case "순번": 현재행.순번 = 데이터값; break;
                        case "사용자": 현재행.사용자 = 데이터값; break;
                        case "부서": 현재행.부서 = 데이터값; break;
                        case "비고": 현재행.비고 = 데이터값; break;
                        case "옵션": 현재행.옵션 = 데이터값; break;
                        case "출고의뢰번호": 현재행.출고의뢰번호 = 데이터값; break;
                        default: break;
                    }
                }
                반환자료.Add(현재행);

            }
            return 반환자료;
        }
        public void 실행중인프로세스끝내기(string processname)
        {
            try
            {
                Process[] Processes = Process.GetProcessesByName(processname);

                foreach (Process process in Processes)
                {
                    process.Kill();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        private void 새엑셀(string 형식구분, string[] 항목목록)
        {
            //실행중인프로세스끝내기("EXCEL");
            string 파일경로 = "";
            파일경로 = $@"C:\Users\User\Desktop\새엑셀\{형식구분}_{DateTime.Now.ToString("yyyy-MM-dd_HHmmss")}.xlsx";
            excelApp = null;
            while (excelApp == null)
            {
                try { excelApp = new Excel.Application(); }
                catch (Exception ex) { }
            }
            Workbook workbook = excelApp.Workbooks.Add();
            for (int i = 0; i < 항목목록.Length; i++)
            {
                workbook.Sheets[1].Cells[1, i + 1] = 항목목록[i];
            }

            // A2셀 선택
            workbook.Sheets[1].Cells[2, 1].Select();
            workbook.SaveAs(파일경로);
            excelApp.Visible = true;
            System.Runtime.InteropServices.Marshal.ReleaseComObject(workbook);
            System.Runtime.InteropServices.Marshal.ReleaseComObject(excelApp);
            return;
        }

        private void 폴더청소_Click(object sender, EventArgs e)
        {
            string 파일경로 = $@"C:\Users\User\Desktop\새엑셀\";
            string[] 파일목록 = System.IO.Directory.GetFiles(파일경로);
            foreach (string 파일 in 파일목록)
            {
                try { System.IO.File.Delete(파일); }
                catch (Exception ex) { }
            }

        }

        private void 렌탈자산용_CheckedChanged(object sender, EventArgs e)
        {
            if (렌탈자산용.Checked)
            {
                라벨바코드스캔.Visible = true;
                제품명출력.Visible = true;
                바코드스캔.Visible = true;
            }
            else
            {
                제품명출력.Visible = false;
                바코드스캔.Visible = false;
            }
        }

        private void 비품용_CheckedChanged(object sender, EventArgs e)
        {
            if (비품용.Checked)
            {
                라벨바코드스캔.Visible = false;
            }
        }

        private void 상품용_CheckedChanged(object sender, EventArgs e)
        {
            if (상품용.Checked)
            {
                라벨바코드스캔.Visible = false;
                관리구분.Visible = true;
                순번출력.Visible = true;

            }
            else
            {
                관리구분.Visible = false;
                순번출력.Visible = false;
            }
        }

        private void 바코드스캔_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == System.Windows.Forms.Keys.Enter)
            {
                string 스캔된바코드_오른쪽_한자리무시 = 바코드스캔.Text.Substring(0, 바코드스캔.Text.Length - 1).ToUpper();
                foreach (자료형태 자산 in 자산목록)
                {
                    if (자산.시리얼넘버 == 바코드스캔.Text.ToUpper() || 자산.시리얼넘버 == 스캔된바코드_오른쪽_한자리무시
                        || (바코드스캔.Text.Length == 9 && 바코드스캔.Text == 자산.자산번호)
                        || (바코드스캔.Text.Length > 9 && 자산.자산번호.Length == 9 && 자산.시리얼넘버.Length > 6 && 바코드스캔.Text.ToUpper().Contains(자산.시리얼넘버))
                        )
                    {

                        if (프린터선택.Text == "ZDesigner GK420D-대형" || 프린터선택.Text == "ZDesigner ZT411-203dpi ZPL")
                        {
                            라벨출력(자산용ZPL생성_대형(자산.자산번호, 자산.제품명, 자산.모델명.ToUpper(), 자산.시리얼넘버.ToUpper()));
                        }
                        if (프린터선택.Text == "ZDesigner GK420D-소형")
                        {
                            라벨출력(자산용ZPL생성_소형(자산.자산번호));
                        }
                        break;
                    }
                }

                바코드스캔.Text = "";
                바코드스캔.Focus();
            }
        }

        private void 자산목록읽기_Click(object sender, EventArgs e)
        {
            string 바탕화면 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string 파일경로 = 바탕화면 + @"\자산목록.xlsx";

            if (File.Exists(파일경로))
            {
                자산목록 = 엑셀파일읽기(파일경로);
            }
            else
            {
                // 파일이 없으면 경고창 띄우기
                MessageBox.Show("바탕화면에 자산목록.xlsx 파일이 없습니다.");
            }
        }

        private void 라벨새액셀_Click(object sender, EventArgs e)
        {
            if (렌탈자산용.Checked) { 새엑셀("자산라벨용", new string[] { "자산번호", "제품명", "모델명", "시리얼" }); }
            if (비품용.Checked) { 새엑셀("비품용", new string[] { "관리번호", "모델명", "시리얼", "사용자", "부서" }); }
            if (상품용.Checked) { 새엑셀("상품용", new string[] { "순번", "모델명", "시리얼" }); }
        }

        private void 입고등록새엑셀_Click(object sender, EventArgs e)
        {
            새엑셀("입고등록용", new string[] { "자산번호", "시리얼" });
        }

        private void 자산정보수정새엑셀_Click(object sender, EventArgs e)
        {
            새엑셀("자산정보수정용", new string[] { "자산번호", "시리얼", "옵션", "선반번호", "교정일자" });
        }



        private void 출고검수새엑셀_Click(object sender, EventArgs e)
        {
            새엑셀("출고검수용", new string[] { "출고의뢰번호", "자산번호", "시리얼" });
        }

        private void 자산취득새엑셀_Click(object sender, EventArgs e)
        {
            새엑셀("자산취득용", new string[] { "발주번호", "시리얼", "내용연수", "잔존가치" });
        }


        private bool 로그인(string id, string pw)
        {
            EdgeOptions edgeOptions = new EdgeOptions();

            // 다운로드 경로 설정
            edgeOptions.AddUserProfilePreference("download.default_directory", downloadPath);
            edgeOptions.AddUserProfilePreference("download.prompt_for_download", false); // 다운로드 시 확인창 표시 안 함
            edgeOptions.AddUserProfilePreference("download.directory_upgrade", true); // 이미 존재하는 경로를 업그레이드

            edgeOptions.PageLoadStrategy = PageLoadStrategy.None; // DOMContentLoaded까지만 대기

            edgeDriverService.HideCommandPromptWindow = true; // Command 창 숨기기
            driver = null;
            while (driver == null)
            {
                try { driver = new EdgeDriver(edgeDriverService, edgeOptions); }
                catch (Exception ex) { MessageBox.Show(ex.Message); }
            }
            driver.Manage().Window.Maximize(); //창 최소화
            driver.Navigate().GoToUrl("http://175.119.156.105:3000/");
            로딩완료 = 로딩완료확인(driver, 100);

            요소 = 요소찾기(driver, 옵션_아이디, "formBasicId");
            요소.SendKeys(id);
            요소 = 요소찾기(driver, 옵션_아이디, "formBasicPassword");
            요소.SendKeys(pw);
            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[text()='로그인']");
            요소.Click();


            로딩완료 = 로딩완료확인(driver, 1000);
            //MessageBox.Show("12312");
            //F5 키 누름

            driver.Navigate().Refresh();

            //Actions actions = new Actions(driver);
            //actions.SendKeys(Keys.F5).Perform();
            //MessageBox.Show("12312");

            로딩완료 = 로딩완료확인(driver, 1000);


            return true;
        }

        public void 로그인설정읽기()
        {
            string filePath = @"C:\UBUS\UTIL\로그인설정.txt";

            if (File.Exists(filePath))
            {
                // 파일을 줄 단위로 읽음
                string[] lines = File.ReadAllLines(filePath);

                foreach (string line in lines)
                {
                    // id 값이 있는 줄 처리
                    if (line.StartsWith("id="))
                    {
                        login_id = line.Substring(3).Trim(); // "id=" 다음의 값 저장
                    }

                    // pw 값이 있는 줄 처리
                    if (line.StartsWith("pw="))
                    {
                        login_pw = line.Substring(3).Trim(); // "pw=" 다음의 값 저장
                    }
                }

                // 읽은 값 출력 (테스트용)
            }
            else
            {
                MessageBox.Show("로그인설정.txt 파일을 찾을 수 없습니다.");
            }
        }

        private void 자산목록갱신_Click(object sender, EventArgs e)
        {
            login_id = "shlee0105";
            login_pw = "1111";
            bool 로그인완료 = 로그인(login_id, login_pw);
            // 다운로드된 csv 파일을 엑셀로 열어서, 바탕화면에 자산목록.xlsx 파일로 저장
            string 바탕화면 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);

            WebDriverWait wait = new WebDriverWait(driver, TimeSpan.FromSeconds(30));

            if (로그인완료 == false) { MessageBox.Show("로그인 실패"); return; }

            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[contains(@class, 'ps-menu-label') and contains(@class, 'css-12w9als') and text()='자산']");     // 자산
            요소.Click();
            // "//span[contains(@class, 'm-lg-3') and text()='입고등록']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[contains(@class, 'm-lg-3') and text()='자산조회']");     // 자산조회
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 4000);


            // 필터설정 없이 조회하여 모든자산 조회
            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[contains(@class, 'ms-2 me-2 btn btn-primary btn-sm') and contains(text(), '조회')]");    // 조회버튼
            요소.Click();


            // downloadPath 경로에 모든 csv 파일 삭제
            string[] csv파일목록 = Directory.GetFiles(downloadPath, "*.csv");
            foreach (string 파일 in csv파일목록)
            {
                try { File.Delete(파일); }
                catch (Exception ex) { }
            }

            로딩완료 = 로딩완료확인(driver, 300);

            //요소 = 요소찾기(driver, 옵션_엑스패스, "//button[contains(@class, 'btn-success') and contains(text(), '데이터내리기')]"); ///내려받기
            //// 이하 테스트 - 원본
            //요소 = wait.Until(driver => driver.FindElement(By.XPath("//button[contains(@class, 'btn-success') and contains(text(), '데이터내리기')]")));
            //요소.Click();
            //이상 테스트 원본

            while (true)
            {
                try
                {
                    요소 = wait.Until(driver => driver.FindElement(By.XPath("//button[contains(@class, 'btn-success') and contains(text(), '데이터내리기')]")));
                    요소.Click();
                    break; // 클릭이 성공하면 루프 종료
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"클릭 실패: {ex.Message}");
                    Thread.Sleep(500); // 0.5초 대기 후 다시 시도
                }
            }
            로딩완료 = 로딩완료확인(driver, 300);



            // "//button[@class='btn btn-primary' and text()='동의 후 다운로드']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@class='btn btn-primary' and text()='동의 후 다운로드']"); ///동의 후 다운로드
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            // downloadPath 경로에 csv 파일이 다운로드 될 때까지 대기
            string[] 다운로드파일목록 = Directory.GetFiles(downloadPath, "*.csv");
            while (다운로드파일목록.Length == 0)     // 다운받은 파일이 아직 0개이면 대기
            {
                Thread.Sleep(100);
                다운로드파일목록 = Directory.GetFiles(downloadPath, "*.csv");
            }

            IWebElement element = driver.FindElement(By.XPath("//i[contains(@class, 'fi fi-rr-user') and contains(@style, 'font-size: 25px;')]"));
            element.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            element = driver.FindElement(By.XPath("//a[@class='dropdown-item' and @role='button' and text()='로그아웃']"));
            element.Click();
            로딩완료 = 로딩완료확인(driver, 300);

            /*
            요소 = 요소찾기(driver, 옵션_엑스패스, "//*[@id=\"root\"]/div/div[1]/nav/div/div[3]/div/div[4]/a/div/i"); ///동의 후 다운로드
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);
            
            요소 = 요소찾기(driver, 옵션_엑스패스, "//*[@id=\"root\"]/div/div[1]/nav/div/div[3]/div/div[4]/a/div/i"); ///동의 후 다운로드
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);
            */

            //// 2026_04_07. 이성호 요청 _ 이성호의 게정은 모든 사업부 자산이 조회 가능하므로 1회만 조회하여 처리함
            //// 이후 부분의 기능인 임시로 미사용 조치함
            /// 여기부터 미사용
            /*
            login_id = "it";
            login_pw = "1111";

            요소 = 요소찾기(driver, 옵션_아이디, "formBasicId");
            요소.SendKeys(login_id);
            요소 = 요소찾기(driver, 옵션_아이디, "formBasicPassword");
            요소.SendKeys(login_pw);
            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[text()='로그인']");
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 1000);
            driver.Navigate().Refresh();
            로딩완료 = 로딩완료확인(driver, 1000);


            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[contains(@class, 'ps-menu-label') and contains(@class, 'css-12w9als') and text()='자산']");     // 자산
            요소.Click();
            // "//span[contains(@class, 'm-lg-3') and text()='입고등록']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//span[contains(@class, 'm-lg-3') and text()='자산조회']");     // 자산조회
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);


            // 필터설정 없이 조회하여 모든자산 조회
            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[contains(@class, 'ms-2 me-2 btn btn-primary btn-sm') and contains(text(), '조회')]");    // 조회버튼
            요소.Click();

            로딩완료 = 로딩완료확인(driver, 2000);

            bool 클릭성공 = false;
            while (!클릭성공)
            {
                try
                {
                    요소 = 요소찾기(driver, 옵션_엑스패스, "//button[contains(@class, 'btn-success') and contains(text(), '데이터내리기')]"); ///내려받기
                    요소.Click();
                    로딩완료 = 로딩완료확인(driver, 300);
                    클릭성공 = true;
                }
                catch { Exception ex; }
            }
            

            // "//button[@class='btn btn-primary' and text()='동의 후 다운로드']"
            요소 = 요소찾기(driver, 옵션_엑스패스, "//button[@class='btn btn-primary' and text()='동의 후 다운로드']"); ///동의 후 다운로드
            요소.Click();
            로딩완료 = 로딩완료확인(driver, 300);
            */
            // downloadPath 경로에 csv 파일이 다운로드 될 때까지 대기
            다운로드파일목록 = Directory.GetFiles(downloadPath, "*.csv");
            
            /*
            while (다운로드파일목록.Length == 1)     // 다운받은 파일이 아직 1개이면 대기
            {
                Thread.Sleep(100);
                다운로드파일목록 = Directory.GetFiles(downloadPath, "*.csv");
            }
            */


            // 현재경로 저장 
            //var 병합파일 = new StreamWriter(병합파일명);

            

            //MessageBox.Show("엑셀열기");
            excelApp = null;
            while (excelApp == null)
            {
                try { excelApp = new Excel.Application(); }
                catch (Exception ex) { }
            }

            //MessageBox.Show("엑셀열림");
            
            excelApp.Visible = true;
            Workbook workbook1 = excelApp.Workbooks.Open(다운로드파일목록[0]);
            Excel.Worksheet targetSheet = workbook1.Sheets[1]; // 첫 번째 시트 사용
            Excel.Range targetUsedRange = targetSheet.UsedRange;

            excelApp.DisplayAlerts = false;

            /*
            Workbook workbook2 = excelApp.Workbooks.Open(다운로드파일목록[1]);
            Excel.Worksheet sourceSheet = workbook2.Sheets[1]; // 첫 번째 시트 사용
            Excel.Range sourceUsedRange = sourceSheet.UsedRange;

            int lastRowTarget = targetUsedRange.Rows.Count;

            // 워크북2의 UsedRange 복사
            sourceUsedRange.Copy();

            // 워크북1의 UsedRange 아래에 붙여넣기
            Excel.Range pasteStart = targetSheet.Cells[lastRowTarget + 1, 2]; // 다음 행의 첫 번째 열
            pasteStart.PasteSpecial(Excel.XlPasteType.xlPasteValues); // 값 붙여넣기
            pasteStart.PasteSpecial(Excel.XlPasteType.xlPasteFormats); // 서식 유지
            

            
            workbook2.Close();
            System.Runtime.InteropServices.Marshal.ReleaseComObject(workbook2);
            //// 여기까지 미사용으로 변경
            */

            // csv 파일을 xlsx 형식으로 저장
            workbook1.SaveAs(바탕화면 + @"\자산목록.xlsx", Excel.XlFileFormat.xlOpenXMLWorkbook);
            workbook1.Close();

            System.Runtime.InteropServices.Marshal.ReleaseComObject(workbook1);
            excelApp.Quit();
            
            
            System.Runtime.InteropServices.Marshal.ReleaseComObject(excelApp);
            //실행중인프로세스끝내기("EXCEL");


            string 파일경로 = 바탕화면 + @"\자산목록.xlsx";

            if (File.Exists(파일경로))
            {
                자산목록 = 엑셀파일읽기(파일경로);
            }
            else
            {
                // 파일이 없으면 경고창 띄우기
                MessageBox.Show("바탕화면에 자산목록.xlsx 파일이 없습니다.");
            }

            driver.Quit();

        }

        private static void 파일병합_CSV(string 대상파일, StreamWriter 병합파일, bool 헤더포함여부)
        {
            using (var reader = new StreamReader(대상파일))
            {
                string line;
                int 행번호 = 0;

                while ((line = reader.ReadLine()) != null)
                {
                    행번호++;
                    if (행번호 == 2 || 행번호 == 1 && !헤더포함여부)
                    {
                        continue;
                    }

                    병합파일.WriteLine(line);
                }
            }
        }

        private void 폴더열기_Click(object sender, EventArgs e)
        {
            string folderPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop) + "\\새엑셀";

            if (System.IO.Directory.Exists(folderPath))
            {
                System.Diagnostics.Process.Start("explorer.exe", folderPath);
            }
            else
            {
                MessageBox.Show("폴더가 존재하지 않습니다: " + folderPath, "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void 설정파일열기_Click(object sender, EventArgs e)
        {
            Process.Start("notepad.exe", @"C:\BarCodePrinter\offset.txt");
        }
        
    }
    public class RawPrinterHelper
    {
        // Structure and API declarions:
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA
        {
            [MarshalAs(UnmanagedType.LPStr)]
            public string pDocName;
            [MarshalAs(UnmanagedType.LPStr)]
            public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)]
            public string pDataType;
        }
        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

        // SendBytesToPrinter()
        // When the function is given a printer name and an unmanaged array
        // of bytes, the function sends those bytes to the print queue.
        // Returns true on success, false on failure.
        public static bool SendBytesToPrinter(string szPrinterName, IntPtr pBytes, Int32 dwCount)
        {
            Int32 dwError = 0, dwWritten = 0;
            IntPtr hPrinter = new IntPtr(0);
            DOCINFOA di = new DOCINFOA();
            bool bSuccess = false; // Assume failure unless you specifically succeed.

            di.pDocName = "My C#.NET RAW Document";
            di.pDataType = "RAW";

            // Open the printer.
            if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero))
            {
                // Start a document.
                if (StartDocPrinter(hPrinter, 1, di))
                {
                    // Start a page.
                    if (StartPagePrinter(hPrinter))
                    {
                        // Write your bytes.
                        bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                        EndPagePrinter(hPrinter);
                    }
                    EndDocPrinter(hPrinter);
                }
                ClosePrinter(hPrinter);
            }
            // If you did not succeed, GetLastError may give more information
            // about why not.
            if (bSuccess == false)
            {
                dwError = Marshal.GetLastWin32Error();
            }
            return bSuccess;
        }

        public static bool SendFileToPrinter(string szPrinterName, string szFileName)
        {
            // Open the file.
            FileStream fs = new FileStream(szFileName, FileMode.Open);
            // Create a BinaryReader on the file.
            BinaryReader br = new BinaryReader(fs);
            // Dim an array of bytes big enough to hold the file's contents.
            Byte[] bytes = new Byte[fs.Length];
            bool bSuccess = false;
            // Your unmanaged pointer.
            IntPtr pUnmanagedBytes = new IntPtr(0);
            int nLength;

            nLength = Convert.ToInt32(fs.Length);
            // Read the contents of the file into the array.
            bytes = br.ReadBytes(nLength);
            // Allocate some unmanaged memory for those bytes.
            pUnmanagedBytes = Marshal.AllocCoTaskMem(nLength);
            // Copy the managed byte array into the unmanaged array.
            Marshal.Copy(bytes, 0, pUnmanagedBytes, nLength);
            // Send the unmanaged bytes to the printer.
            bSuccess = SendBytesToPrinter(szPrinterName, pUnmanagedBytes, nLength);
            // Free the unmanaged memory that you allocated earlier.
            Marshal.FreeCoTaskMem(pUnmanagedBytes);
            // fs를 파괴   
            fs.Close();
            fs.Dispose();

            return bSuccess;
        }

        public static bool SendStringToPrinter(string szPrinterName, string szString)
        {
            IntPtr pBytes;
            Int32 dwCount;
            // How many characters are in the string?
            dwCount = szString.Length;
            // Assume that the printer is expecting ANSI text, and then convert
            // the string to ANSI text.
            pBytes = Marshal.StringToCoTaskMemAnsi(szString);
            // Send the converted ANSI string to the printer.
            SendBytesToPrinter(szPrinterName, pBytes, dwCount);
            Marshal.FreeCoTaskMem(pBytes);
            return true;
        }

    }
}
