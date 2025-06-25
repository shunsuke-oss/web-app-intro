document.addEventListener('DOMContentLoaded', () => {
    const dataList = document.getElementById('data-list');
    const addDataForm = document.getElementById('add-data-form');
    const value1Input = document.getElementById('value1');
    const value2Input = document.getElementById('value2');

    // データ一覧を取得して表示する関数
    async function fetchData() {
        try {
            const response = await fetch('/data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            dataList.innerHTML = ''; // 既存のリストをクリア
            data.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = `ID: ${item.id}, 値1: ${item.value_1}, 値2: ${item.value_2 || 'N/A'}`;
                dataList.appendChild(listItem);
            });
        } catch (error) {
            console.error('データの取得に失敗しました:', error);
            dataList.innerHTML = '<li>データの取得に失敗しました。</li>';
        }
    }

    // データ追加フォームの送信イベントリスナー
    addDataForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // デフォルトのフォーム送信をキャンセル

        const value1 = value1Input.value;
        const value2 = value2Input.value;

        try {
            const response = await fetch('/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value_1: value1, value_2: value2 }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // フォームをクリア
            value1Input.value = '';
            value2Input.value = '';

            // データ一覧を再読み込み
            await fetchData();

        } catch (error) {
            console.error('データの追加に失敗しました:', error);
            alert('データの追加に失敗しました。');
        }
    });

    // 初期データの読み込み
    fetchData();
});