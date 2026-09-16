// 站点级更新公告、帮助和反馈。反馈仅生成内容，由用户决定是否提交到 GitHub。
(function () {
    'use strict';
    const REPOSITORY_ISSUES = 'https://github.com/xuhaiqi/research-tools/issues/new';
    const byId = id => document.getElementById(id);

    function openDialog(id) {
        const dialog = byId(id);
        if (!dialog) return;
        if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
        document.body.classList.add('dialog-open');
    }

    function closeDialog(id) {
        const dialog = byId(id);
        if (!dialog) return;
        if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
        if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    }

    async function copyText(text) {
        try { await navigator.clipboard.writeText(text); }
        catch {
            const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
        }
    }

    function buildFeedback() {
        const type = byId('feedback-type').value;
        const tool = byId('feedback-tool').value.trim() || '未指定';
        const title = byId('feedback-title').value.trim();
        const description = byId('feedback-description').value.trim();
        const environment = byId('feedback-environment').value.trim() || `${navigator.userAgent}`;
        if (!title || !description) throw new Error('请填写问题标题和问题描述。');
        const body = [`## 问题类型`, type, '', `## 涉及工具`, tool, '', `## 问题描述`, description, '', `## 复现环境`, environment, '', `---`, `来自科研工具集网页反馈表单`].join('\n');
        return { title: `[${type}] ${title}`, body };
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.closeDialog)));
        document.querySelectorAll('.site-dialog').forEach(dialog => {
            dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog.id); });
            dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open'); });
        });
        byId('help-open').addEventListener('click', () => openDialog('help-dialog'));
        byId('feedback-open').addEventListener('click', () => openDialog('feedback-dialog'));
        byId('update-help-open').addEventListener('click', () => { closeDialog('update-dialog'); openDialog('help-dialog'); });

        byId('feedback-form').addEventListener('submit', event => {
            event.preventDefault();
            try {
                const feedback = buildFeedback();
                byId('feedback-preview').textContent = `${feedback.title}\n\n${feedback.body}`;
                byId('feedback-github').href = `${REPOSITORY_ISSUES}?title=${encodeURIComponent(feedback.title)}&body=${encodeURIComponent(feedback.body)}`;
                byId('feedback-result').classList.remove('hidden');
                byId('feedback-status').textContent = '反馈内容已生成，请复制或前往 GitHub 提交。';
                byId('feedback-status').className = 'dialog-status success';
            } catch (error) {
                byId('feedback-status').textContent = error.message;
                byId('feedback-status').className = 'dialog-status error';
            }
        });
        byId('feedback-copy').addEventListener('click', () => {
            copyText(byId('feedback-preview').textContent).then(() => {
                byId('feedback-status').textContent = '反馈内容已复制。'; byId('feedback-status').className = 'dialog-status success';
            }).catch(() => { byId('feedback-status').textContent = '复制失败，请手动选择预览内容。'; byId('feedback-status').className = 'dialog-status error'; });
        });

        openDialog('update-dialog');
    });
}());
