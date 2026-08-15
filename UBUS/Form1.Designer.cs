using System.Windows.Forms;

namespace UBUS
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Form1));
            고객사CI = new PictureBox();
            MyCI = new PictureBox();
            tabControl = new TabControl();
            tabPage1 = new TabPage();
            순번출력 = new CheckBox();
            엑셀파일일괄출력 = new Button();
            설정파일열기 = new Button();
            라벨새액셀 = new Button();
            제품명출력 = new CheckBox();
            출력매수 = new TextBox();
            관리구분 = new TextBox();
            바코드스캔 = new TextBox();
            자산목록읽기 = new Button();
            프린터선택 = new ComboBox();
            상품용 = new RadioButton();
            비품용 = new RadioButton();
            렌탈자산용 = new RadioButton();
            라벨기본출력매수 = new Label();
            라벨프린터선택 = new Label();
            진행상황 = new Label();
            라벨바코드스캔 = new Label();
            tabPage2 = new TabPage();
            라벨파일드래그2 = new Label();
            입고등록새엑셀 = new Button();
            tabPage3 = new TabPage();
            라벨파일드래그3 = new Label();
            자산정보수정새엑셀 = new Button();
            tabPage4 = new TabPage();
            라벨파일드래그4 = new Label();
            출고검수새엑셀 = new Button();
            종료예약 = new CheckBox();
            tabPage5 = new TabPage();
            라벨파일드래그5 = new Label();
            자산취득새엑셀 = new Button();
            폴더청소 = new Button();
            자산목록갱신 = new Button();
            폴더열기 = new Button();
            ((System.ComponentModel.ISupportInitialize)고객사CI).BeginInit();
            ((System.ComponentModel.ISupportInitialize)MyCI).BeginInit();
            tabControl.SuspendLayout();
            tabPage1.SuspendLayout();
            tabPage2.SuspendLayout();
            tabPage3.SuspendLayout();
            tabPage4.SuspendLayout();
            tabPage5.SuspendLayout();
            SuspendLayout();
            // 
            // 고객사CI
            // 
            고객사CI.Image = Properties.Resources.ubus;
            고객사CI.Location = new Point(501, 2);
            고객사CI.Name = "고객사CI";
            고객사CI.Size = new Size(93, 58);
            고객사CI.SizeMode = PictureBoxSizeMode.StretchImage;
            고객사CI.TabIndex = 0;
            고객사CI.TabStop = false;
            // 
            // MyCI
            // 
            MyCI.Image = Properties.Resources.드래곤_RPA_로고__영문___png_24_;
            MyCI.Location = new Point(501, 64);
            MyCI.Name = "MyCI";
            MyCI.Size = new Size(93, 65);
            MyCI.SizeMode = PictureBoxSizeMode.StretchImage;
            MyCI.TabIndex = 0;
            MyCI.TabStop = false;
            // 
            // tabControl
            // 
            tabControl.Controls.Add(tabPage1);
            tabControl.Controls.Add(tabPage2);
            tabControl.Controls.Add(tabPage3);
            tabControl.Controls.Add(tabPage4);
            tabControl.Controls.Add(tabPage5);
            tabControl.DrawMode = TabDrawMode.OwnerDrawFixed;
            tabControl.Location = new Point(12, 7);
            tabControl.Name = "tabControl";
            tabControl.SelectedIndex = 0;
            tabControl.Size = new Size(483, 232);
            tabControl.TabIndex = 1;
            tabControl.DrawItem += TabControl_DrawItem;
            // 
            // tabPage1
            // 
            tabPage1.AllowDrop = true;
            tabPage1.BackColor = Color.LightBlue;
            tabPage1.Controls.Add(순번출력);
            tabPage1.Controls.Add(엑셀파일일괄출력);
            tabPage1.Controls.Add(설정파일열기);
            tabPage1.Controls.Add(라벨새액셀);
            tabPage1.Controls.Add(제품명출력);
            tabPage1.Controls.Add(출력매수);
            tabPage1.Controls.Add(관리구분);
            tabPage1.Controls.Add(바코드스캔);
            tabPage1.Controls.Add(자산목록읽기);
            tabPage1.Controls.Add(프린터선택);
            tabPage1.Controls.Add(상품용);
            tabPage1.Controls.Add(비품용);
            tabPage1.Controls.Add(렌탈자산용);
            tabPage1.Controls.Add(라벨기본출력매수);
            tabPage1.Controls.Add(라벨프린터선택);
            tabPage1.Controls.Add(진행상황);
            tabPage1.Controls.Add(라벨바코드스캔);
            tabPage1.Location = new Point(4, 24);
            tabPage1.Name = "tabPage1";
            tabPage1.Size = new Size(475, 204);
            tabPage1.TabIndex = 0;
            tabPage1.Text = " 바코드출력 ";
            tabPage1.DragEnter += TabPage1_DragEnter;
            // 
            // 순번출력
            // 
            순번출력.AutoSize = true;
            순번출력.Location = new Point(157, 86);
            순번출력.Name = "순번출력";
            순번출력.Size = new Size(74, 19);
            순번출력.TabIndex = 5;
            순번출력.Text = "순번출력";
            순번출력.UseVisualStyleBackColor = true;
            순번출력.Visible = false;
            // 
            // 엑셀파일일괄출력
            // 
            엑셀파일일괄출력.AllowDrop = true;
            엑셀파일일괄출력.BackColor = Color.PowderBlue;
            엑셀파일일괄출력.Location = new Point(330, 0);
            엑셀파일일괄출력.Name = "엑셀파일일괄출력";
            엑셀파일일괄출력.Size = new Size(145, 116);
            엑셀파일일괄출력.TabIndex = 0;
            엑셀파일일괄출력.Text = "엑셀파일 끌어놓기";
            엑셀파일일괄출력.UseVisualStyleBackColor = false;
            엑셀파일일괄출력.DragDrop += 엑셀파일일괄출력_DragDrop;
            엑셀파일일괄출력.DragEnter += 엑셀파일일괄출력_DragEnter;
            // 
            // 설정파일열기
            // 
            설정파일열기.BackColor = Color.LightCyan;
            설정파일열기.Location = new Point(330, 117);
            설정파일열기.Name = "설정파일열기";
            설정파일열기.Size = new Size(142, 37);
            설정파일열기.TabIndex = 0;
            설정파일열기.Text = "설정파일열기";
            설정파일열기.UseVisualStyleBackColor = false;
            설정파일열기.Click += 설정파일열기_Click;
            // 
            // 라벨새액셀
            // 
            라벨새액셀.BackColor = Color.LightCyan;
            라벨새액셀.Location = new Point(330, 157);
            라벨새액셀.Name = "라벨새액셀";
            라벨새액셀.Size = new Size(142, 37);
            라벨새액셀.TabIndex = 0;
            라벨새액셀.Text = "new Excel";
            라벨새액셀.UseVisualStyleBackColor = false;
            라벨새액셀.Click += 라벨새액셀_Click;
            // 
            // 제품명출력
            // 
            제품명출력.AutoSize = true;
            제품명출력.Checked = true;
            제품명출력.CheckState = CheckState.Checked;
            제품명출력.Location = new Point(157, 67);
            제품명출력.Name = "제품명출력";
            제품명출력.Size = new Size(86, 19);
            제품명출력.TabIndex = 5;
            제품명출력.Text = "제품명출력";
            제품명출력.UseVisualStyleBackColor = true;
            // 
            // 출력매수
            // 
            출력매수.Location = new Point(290, 159);
            출력매수.Name = "출력매수";
            출력매수.Size = new Size(34, 23);
            출력매수.TabIndex = 4;
            출력매수.Text = "1";
            // 
            // 관리구분
            // 
            관리구분.Location = new Point(157, 114);
            관리구분.Name = "관리구분";
            관리구분.Size = new Size(150, 23);
            관리구분.TabIndex = 4;
            관리구분.Text = "관리구분 : 상품";
            // 
            // 바코드스캔
            // 
            바코드스캔.Location = new Point(13, 156);
            바코드스캔.Name = "바코드스캔";
            바코드스캔.Size = new Size(150, 23);
            바코드스캔.TabIndex = 4;
            바코드스캔.KeyDown += 바코드스캔_KeyDown;
            // 
            // 자산목록읽기
            // 
            자산목록읽기.Location = new Point(13, 35);
            자산목록읽기.Name = "자산목록읽기";
            자산목록읽기.Size = new Size(280, 23);
            자산목록읽기.TabIndex = 3;
            자산목록읽기.Text = "바탕화면\\자산목록.xlsx 다시읽기";
            자산목록읽기.UseVisualStyleBackColor = true;
            자산목록읽기.Click += 자산목록읽기_Click;
            // 
            // 프린터선택
            // 
            프린터선택.FormattingEnabled = true;
            프린터선택.Location = new Point(90, 7);
            프린터선택.Name = "프린터선택";
            프린터선택.Size = new Size(203, 23);
            프린터선택.TabIndex = 2;
            프린터선택.Text = "ZDesigner ZT411-203dpi ZPL";
            // 
            // 상품용
            // 
            상품용.AutoSize = true;
            상품용.Location = new Point(13, 113);
            상품용.Name = "상품용";
            상품용.Size = new Size(61, 19);
            상품용.TabIndex = 1;
            상품용.Text = "상품용";
            상품용.UseVisualStyleBackColor = true;
            상품용.CheckedChanged += 상품용_CheckedChanged;
            // 
            // 비품용
            // 
            비품용.AutoSize = true;
            비품용.Location = new Point(13, 91);
            비품용.Name = "비품용";
            비품용.Size = new Size(61, 19);
            비품용.TabIndex = 1;
            비품용.Text = "비품용";
            비품용.UseVisualStyleBackColor = true;
            비품용.CheckedChanged += 비품용_CheckedChanged;
            // 
            // 렌탈자산용
            // 
            렌탈자산용.AutoSize = true;
            렌탈자산용.Checked = true;
            렌탈자산용.Location = new Point(13, 66);
            렌탈자산용.Name = "렌탈자산용";
            렌탈자산용.Size = new Size(85, 19);
            렌탈자산용.TabIndex = 1;
            렌탈자산용.TabStop = true;
            렌탈자산용.Text = "렌탈자산용";
            렌탈자산용.UseVisualStyleBackColor = true;
            렌탈자산용.CheckedChanged += 렌탈자산용_CheckedChanged;
            // 
            // 라벨기본출력매수
            // 
            라벨기본출력매수.AutoSize = true;
            라벨기본출력매수.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point, 129);
            라벨기본출력매수.Location = new Point(201, 162);
            라벨기본출력매수.Name = "라벨기본출력매수";
            라벨기본출력매수.Size = new Size(83, 15);
            라벨기본출력매수.TabIndex = 0;
            라벨기본출력매수.Text = "기본출력 매수";
            // 
            // 라벨프린터선택
            // 
            라벨프린터선택.AutoSize = true;
            라벨프린터선택.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point, 129);
            라벨프린터선택.Location = new Point(13, 11);
            라벨프린터선택.Name = "라벨프린터선택";
            라벨프린터선택.Size = new Size(71, 15);
            라벨프린터선택.TabIndex = 0;
            라벨프린터선택.Text = "프린터 선택";
            // 
            // 진행상황
            // 
            진행상황.Font = new Font("맑은 고딕", 9F, FontStyle.Bold, GraphicsUnit.Point, 129);
            진행상황.ForeColor = Color.Red;
            진행상황.Location = new Point(13, 181);
            진행상황.Name = "진행상황";
            진행상황.Size = new Size(271, 25);
            진행상황.TabIndex = 0;
            // 
            // 라벨바코드스캔
            // 
            라벨바코드스캔.AutoSize = true;
            라벨바코드스캔.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point, 129);
            라벨바코드스캔.Location = new Point(13, 139);
            라벨바코드스캔.Name = "라벨바코드스캔";
            라벨바코드스캔.Size = new Size(71, 15);
            라벨바코드스캔.TabIndex = 0;
            라벨바코드스캔.Text = "바코드 스캔";
            // 
            // tabPage2
            // 
            tabPage2.AllowDrop = true;
            tabPage2.BackColor = Color.LightBlue;
            tabPage2.Controls.Add(라벨파일드래그2);
            tabPage2.Controls.Add(입고등록새엑셀);
            tabPage2.Location = new Point(4, 24);
            tabPage2.Name = "tabPage2";
            tabPage2.Size = new Size(475, 204);
            tabPage2.TabIndex = 1;
            tabPage2.Text = " 입고등록 ";
            tabPage2.DragDrop += 실행기능_입고등록;
            tabPage2.DragEnter += TabPage2_DragEnter;
            // 
            // 라벨파일드래그2
            // 
            라벨파일드래그2.AutoSize = true;
            라벨파일드래그2.Font = new Font("맑은 고딕", 14.25F, FontStyle.Regular, GraphicsUnit.Point, 129);
            라벨파일드래그2.Location = new Point(147, 73);
            라벨파일드래그2.Name = "라벨파일드래그2";
            라벨파일드래그2.Size = new Size(190, 25);
            라벨파일드래그2.TabIndex = 0;
            라벨파일드래그2.Text = "파일을 끌어놓으세요";
            // 
            // 입고등록새엑셀
            // 
            입고등록새엑셀.BackColor = Color.LightCyan;
            입고등록새엑셀.Location = new Point(330, 157);
            입고등록새엑셀.Name = "입고등록새엑셀";
            입고등록새엑셀.Size = new Size(142, 37);
            입고등록새엑셀.TabIndex = 0;
            입고등록새엑셀.Text = "new Excel";
            입고등록새엑셀.UseVisualStyleBackColor = false;
            입고등록새엑셀.Click += 입고등록새엑셀_Click;
            // 
            // tabPage3
            // 
            tabPage3.AllowDrop = true;
            tabPage3.BackColor = Color.LightBlue;
            tabPage3.Controls.Add(라벨파일드래그3);
            tabPage3.Controls.Add(자산정보수정새엑셀);
            tabPage3.Location = new Point(4, 24);
            tabPage3.Name = "tabPage3";
            tabPage3.Size = new Size(475, 204);
            tabPage3.TabIndex = 1;
            tabPage3.Text = " 자산정보수정 ";
            tabPage3.DragDrop += 실행기능_자산정보수정;
            tabPage3.DragEnter += TabPage3_DragEnter;
            // 
            // 라벨파일드래그3
            // 
            라벨파일드래그3.AutoSize = true;
            라벨파일드래그3.Font = new Font("맑은 고딕", 14.25F, FontStyle.Regular, GraphicsUnit.Point, 129);
            라벨파일드래그3.Location = new Point(147, 73);
            라벨파일드래그3.Name = "라벨파일드래그3";
            라벨파일드래그3.Size = new Size(190, 25);
            라벨파일드래그3.TabIndex = 0;
            라벨파일드래그3.Text = "파일을 끌어놓으세요";
            // 
            // 자산정보수정새엑셀
            // 
            자산정보수정새엑셀.BackColor = Color.LightCyan;
            자산정보수정새엑셀.Location = new Point(330, 157);
            자산정보수정새엑셀.Name = "자산정보수정새엑셀";
            자산정보수정새엑셀.Size = new Size(142, 37);
            자산정보수정새엑셀.TabIndex = 0;
            자산정보수정새엑셀.Text = "new Excel";
            자산정보수정새엑셀.UseVisualStyleBackColor = false;
            자산정보수정새엑셀.Click += 자산정보수정새엑셀_Click;
            // 
            // tabPage4
            // 
            tabPage4.AllowDrop = true;
            tabPage4.BackColor = Color.LightBlue;
            tabPage4.Controls.Add(라벨파일드래그4);
            tabPage4.Controls.Add(출고검수새엑셀);
            tabPage4.Controls.Add(종료예약);
            tabPage4.Location = new Point(4, 24);
            tabPage4.Name = "tabPage4";
            tabPage4.Size = new Size(475, 204);
            tabPage4.TabIndex = 1;
            tabPage4.Text = " 출고검수 ";
            tabPage4.DragDrop += 실행기능_출고검수;
            tabPage4.DragEnter += TabPage4_DragEnter;
            // 
            // 라벨파일드래그4
            // 
            라벨파일드래그4.AutoSize = true;
            라벨파일드래그4.Font = new Font("맑은 고딕", 14.25F, FontStyle.Regular, GraphicsUnit.Point, 129);
            라벨파일드래그4.Location = new Point(147, 73);
            라벨파일드래그4.Name = "라벨파일드래그4";
            라벨파일드래그4.Size = new Size(190, 25);
            라벨파일드래그4.TabIndex = 0;
            라벨파일드래그4.Text = "파일을 끌어놓으세요";
            // 
            // 출고검수새엑셀
            // 
            출고검수새엑셀.BackColor = Color.LightCyan;
            출고검수새엑셀.Location = new Point(330, 157);
            출고검수새엑셀.Name = "출고검수새엑셀";
            출고검수새엑셀.Size = new Size(142, 37);
            출고검수새엑셀.TabIndex = 0;
            출고검수새엑셀.Text = "new Excel";
            출고검수새엑셀.UseVisualStyleBackColor = false;
            출고검수새엑셀.Click += 출고검수새엑셀_Click;
            // 
            // 종료예약
            // 
            종료예약.AutoSize = true;
            종료예약.Checked = true;
            종료예약.CheckState = CheckState.Checked;
            종료예약.Location = new Point(104, 167);
            종료예약.Name = "종료예약";
            종료예약.Size = new Size(217, 19);
            종료예약.TabIndex = 5;
            종료예약.Text = "18~08시 검수완료 >> PC 자동종료";
            종료예약.UseVisualStyleBackColor = true;
            // 
            // tabPage5
            // 
            tabPage5.AllowDrop = true;
            tabPage5.BackColor = Color.LightBlue;
            tabPage5.Controls.Add(라벨파일드래그5);
            tabPage5.Controls.Add(자산취득새엑셀);
            tabPage5.Location = new Point(4, 24);
            tabPage5.Name = "tabPage5";
            tabPage5.Size = new Size(475, 204);
            tabPage5.TabIndex = 1;
            tabPage5.Text = " 자산취득 ";
            tabPage5.DragDrop += TabPage5_DragDrop;
            tabPage5.DragEnter += TabPage5_DragEnter;
            // 
            // 라벨파일드래그5
            // 
            라벨파일드래그5.AutoSize = true;
            라벨파일드래그5.Font = new Font("맑은 고딕", 14.25F, FontStyle.Regular, GraphicsUnit.Point, 129);
            라벨파일드래그5.Location = new Point(147, 73);
            라벨파일드래그5.Name = "라벨파일드래그5";
            라벨파일드래그5.Size = new Size(190, 25);
            라벨파일드래그5.TabIndex = 0;
            라벨파일드래그5.Text = "파일을 끌어놓으세요";
            // 
            // 자산취득새엑셀
            // 
            자산취득새엑셀.BackColor = Color.LightCyan;
            자산취득새엑셀.Location = new Point(330, 157);
            자산취득새엑셀.Name = "자산취득새엑셀";
            자산취득새엑셀.Size = new Size(142, 37);
            자산취득새엑셀.TabIndex = 0;
            자산취득새엑셀.Text = "new Excel";
            자산취득새엑셀.UseVisualStyleBackColor = false;
            자산취득새엑셀.Click += 자산취득새엑셀_Click;
            // 
            // 폴더청소
            // 
            폴더청소.Location = new Point(501, 212);
            폴더청소.Name = "폴더청소";
            폴더청소.Size = new Size(93, 27);
            폴더청소.TabIndex = 0;
            폴더청소.Text = "폴더청소";
            폴더청소.Click += 폴더청소_Click;
            // 
            // 자산목록갱신
            // 
            자산목록갱신.Location = new Point(501, 132);
            자산목록갱신.Name = "자산목록갱신";
            자산목록갱신.Size = new Size(93, 53);
            자산목록갱신.TabIndex = 0;
            자산목록갱신.Text = "자산목록갱신";
            자산목록갱신.Click += 자산목록갱신_Click;
            // 
            // 폴더열기
            // 
            폴더열기.Location = new Point(501, 184);
            폴더열기.Name = "폴더열기";
            폴더열기.Size = new Size(93, 27);
            폴더열기.TabIndex = 0;
            폴더열기.Text = "폴더열기";
            폴더열기.Click += 폴더열기_Click;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(601, 246);
            Controls.Add(폴더열기);
            Controls.Add(폴더청소);
            Controls.Add(자산목록갱신);
            Controls.Add(고객사CI);
            Controls.Add(MyCI);
            Controls.Add(tabControl);
            Icon = (Icon)resources.GetObject("$this.Icon");
            MaximizeBox = false;
            Name = "Form1";
            Text = "UBUS 관리도구";
            Load += Form1_Load;
            ((System.ComponentModel.ISupportInitialize)고객사CI).EndInit();
            ((System.ComponentModel.ISupportInitialize)MyCI).EndInit();
            tabControl.ResumeLayout(false);
            tabPage1.ResumeLayout(false);
            tabPage1.PerformLayout();
            tabPage2.ResumeLayout(false);
            tabPage2.PerformLayout();
            tabPage3.ResumeLayout(false);
            tabPage3.PerformLayout();
            tabPage4.ResumeLayout(false);
            tabPage4.PerformLayout();
            tabPage5.ResumeLayout(false);
            tabPage5.PerformLayout();
            ResumeLayout(false);
        }

        #endregion
        private PictureBox 고객사CI;
        private PictureBox MyCI;
        private TabControl tabControl;
        private TabPage tabPage1;
        private TabPage tabPage2;
        private TabPage tabPage3;
        private TabPage tabPage4;
        private TabPage tabPage5;
        private Button 폴더청소;
        private Label 라벨프린터선택;
        private Label 라벨파일드래그2;
        private Label 라벨파일드래그3;
        private Label 라벨파일드래그4;
        private Label 라벨파일드래그5;
        private RadioButton 상품용;
        private RadioButton 비품용;
        private RadioButton 렌탈자산용;
        private CheckBox 제품명출력;
        private CheckBox 종료예약;
        private TextBox 출력매수;
        private TextBox 관리구분;
        private TextBox 바코드스캔;
        private Button 자산목록읽기;
        private ComboBox 프린터선택;
        private Label 라벨기본출력매수;
        private Label 라벨바코드스캔;
        private CheckBox 순번출력;
        private Button 엑셀파일일괄출력;
        private Button 자산목록갱신;
        private Button 라벨새액셀;
        private Button 입고등록새엑셀;
        private Button 자산정보수정새엑셀;
        private Button 출고검수새엑셀;
        private Button 자산취득새엑셀;
        private Label 진행상황;
        private Button 폴더열기;
        private Button 설정파일열기;
    }
}
