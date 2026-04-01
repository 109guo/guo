// 应用状态
const AppState = {
    questions: ALL_QUESTIONS || [],
    currentIndex: 0,
    answeredCount: 0,
    correctCount: 0,
    selectedAnswer: null,
    mode: 'sequential', // sequential 或 random
    usedIndices: new Set(), // 用于随机模式记录已用题目
};

// DOM 元素
const DOM = {
    jumpBtn: document.getElementById('jump-btn'),  // 添加这行
    questionText: document.getElementById('question-text'),
    questionType: document.getElementById('question-type'),
    currentIndex: document.getElementById('current-index'),
    totalCount: document.getElementById('total-count'),
    progressBar: document.getElementById('progress-bar'),
    optionsContainer: document.getElementById('options-container'),
    questionImageContainer: document.getElementById('question-image-container'),
    prevBtn: document.getElementById('prev-btn'),
    submitBtn: document.getElementById('submit-btn'),
    nextBtn: document.getElementById('next-btn'),
    sequentialBtn: document.getElementById('sequential-btn'),
    randomBtn: document.getElementById('random-btn'),
    accuracyRate: document.getElementById('accuracy-rate'),
    answeredCount: document.getElementById('answered-count')
};

// 初始化
function init() {
    if (!AppState.questions.length) {
        alert('题库加载失败');
        return;
    }

    DOM.totalCount.textContent = AppState.questions.length;
    updateModeButtons();
    showCurrentQuestion();
    bindEvents();
}
// 跳转题目函数
function jumpToQuestion() {
    // 1. 获取用户输入
    const input = prompt(`请输入题号 (1-${AppState.questions.length})：`, 
                         AppState.currentIndex + 1);
    
    // 2. 用户点击取消或关闭
    if (input === null) {
        console.log('用户取消了跳转');
        return;
    }
    
    // 3. 验证输入是否为有效数字
    const targetNumber = parseInt(input);
    if (isNaN(targetNumber)) {
        alert('请输入有效的数字！');
        return;
    }
    
    // 4. 边界检查
    let validNumber = targetNumber;
    if (validNumber < 1) {
        validNumber = 1;
    }
    if (validNumber > AppState.questions.length) {
        validNumber = AppState.questions.length;
    }
    
    // 5. 转换为0-based索引
    const targetIndex = validNumber - 1;
    
    // 6. 执行跳转
    AppState.currentIndex = targetIndex;
    showCurrentQuestion();
    
    console.log(`跳转到第${validNumber}题`);
}
// 显示当前题目
function showCurrentQuestion() {
    const question = AppState.questions[AppState.currentIndex];

    // 更新题目信息
    DOM.questionText.textContent = question.question;
    DOM.questionType.textContent = question.type === 'single' ? '单选题' : '判断题';
    DOM.currentIndex.textContent = AppState.currentIndex + 1;

    // 更新进度条
    const progress = ((AppState.currentIndex + 1) / AppState.questions.length) * 100;
    DOM.progressBar.value = progress;

    // 清空图片
    DOM.questionImageContainer.innerHTML = '';

    // 显示题干图片
    if (question.questionImage) {
        const img = document.createElement('img');
        img.src = question.questionImage;
        img.className = 'question-image';
        img.alt = '题目图片';
        DOM.questionImageContainer.appendChild(img);
    }

    // 生成选项
    renderOptions(question);

    // 重置选择
    AppState.selectedAnswer = null;
    DOM.submitBtn.disabled = false;
}

// 渲染选项
function renderOptions(question) {
    DOM.optionsContainer.innerHTML = '';

    let options = [];
    if (question.type === 'single') {
        options = question.options;
    } else {
        // 判断题：对和错
        options = [
            { id: '对', text: '对', image: null },
            { id: '错', text: '错', image: null }
        ];
    }

    options.forEach(option => {
        const div = document.createElement('div');
        div.className = 'option-item box';
        div.dataset.optionId = option.id;

        const content = document.createElement('div');
        content.className = 'level is-mobile';

        const left = document.createElement('div');
        left.className = 'level-left';

        const letter = document.createElement('span');
        letter.className = 'tag is-info mr-3';
        letter.textContent = option.id;

        const text = document.createElement('span');
        text.textContent = option.text || '';

        left.appendChild(letter);
        left.appendChild(text);
        content.appendChild(left);

        // 选项图片
        if (option.image) {
            const right = document.createElement('div');
            right.className = 'level-right';
            const img = document.createElement('img');
            img.src = option.image;
            img.className = 'option-image';
            right.appendChild(img);
            content.appendChild(right);
        }

        div.appendChild(content);
        div.addEventListener('click', () => selectOption(option.id));
        DOM.optionsContainer.appendChild(div);
    });
}

// 选择选项
function selectOption(optionId) {
    // 移除之前的选择
    document.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('selected');
    });

    // 设置新的选择
    const selected = document.querySelector(`.option-item[data-option-id="${optionId}"]`);
    if (selected) {
        selected.classList.add('selected');
        AppState.selectedAnswer = optionId;
    }
}

// 提交答案
function submitAnswer() {
    if (!AppState.selectedAnswer) {
        alert('请先选择答案');
        return;
    }

    const question = AppState.questions[AppState.currentIndex];
    const isCorrect = AppState.selectedAnswer === question.answer;

    // 更新统计
    AppState.answeredCount++;
    if (isCorrect) AppState.correctCount++;

    // 更新统计显示
    const accuracy = AppState.answeredCount > 0
        ? Math.round((AppState.correctCount / AppState.answeredCount) * 100)
        : 0;
    DOM.accuracyRate.textContent = `${accuracy}%`;
    DOM.answeredCount.textContent = AppState.answeredCount;

    // 显示正确/错误
    document.querySelectorAll('.option-item').forEach(item => {
        const optionId = item.dataset.optionId;
        if (optionId === question.answer) {
            item.classList.add('correct');
        } else if (optionId === AppState.selectedAnswer && optionId !== question.answer) {
            item.classList.add('wrong');
        }
        item.style.pointerEvents = 'none';
    });

    // 禁用提交按钮
    DOM.submitBtn.disabled = true;
}

// 切换模式
function setMode(mode) {
    AppState.mode = mode;
    updateModeButtons();

    if (mode === 'random') {
        AppState.usedIndices = new Set();
        getRandomQuestion();
    }
}

// 更新模式按钮状态
function updateModeButtons() {
    DOM.sequentialBtn.classList.toggle('is-success', AppState.mode === 'sequential');
    DOM.randomBtn.classList.toggle('is-success', AppState.mode === 'random');
}

// 获取随机题目
function getRandomQuestion() {
    if (AppState.usedIndices.size >= AppState.questions.length) {
        alert('所有题目已完成！');
        return;
    }

    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * AppState.questions.length);
    } while (AppState.usedIndices.has(randomIndex));

    AppState.usedIndices.add(randomIndex);
    AppState.currentIndex = randomIndex;
    showCurrentQuestion();
}

// 绑定事件
function bindEvents() {
    DOM.jumpBtn.addEventListener('click', jumpToQuestion);
    DOM.prevBtn.addEventListener('click', () => {
        if (AppState.mode === 'sequential') {
            if (AppState.currentIndex > 0) {
                AppState.currentIndex--;
                showCurrentQuestion();
            }
        }
    });

    DOM.nextBtn.addEventListener('click', () => {
        if (AppState.mode === 'sequential') {
            if (AppState.currentIndex < AppState.questions.length - 1) {
                AppState.currentIndex++;
                showCurrentQuestion();
            }
        } else {
            getRandomQuestion();
        }
    });

    DOM.submitBtn.addEventListener('click', submitAnswer);

    DOM.sequentialBtn.addEventListener('click', () => setMode('sequential'));
    DOM.randomBtn.addEventListener('click', () => setMode('random'));

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                if (DOM.prevBtn.disabled !== true) DOM.prevBtn.click();
                break;
            case 'ArrowRight':
                if (DOM.nextBtn.disabled !== true) DOM.nextBtn.click();
                break;
            case 'Enter':
                if (!DOM.submitBtn.disabled) DOM.submitBtn.click();
                break;
            case '1': case '2': case '3': case '4':
                const optionId = String.fromCharCode(64 + parseInt(e.key));
                selectOption(optionId);
                break;
            case 'y':
                selectOption('对');
                break;
            case 'n':
                selectOption('错');
                break;
        }
    });
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);