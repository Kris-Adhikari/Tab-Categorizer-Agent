importScripts('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/supabase.min.js');

const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'chatWithOpenAI') {
    try {
      const allTabsContext = (request.tabsContext || [])
        .map((t, i) => `${i + 1}. ${t.title} (${t.url})`)
        .join('\n');

      const lastUserMsg =
        request.messages[request.messages.length - 1]?.content || '';

      const userPrompt = `Current Tab Title: ${request.tabTitle}
Current Tab URL: ${request.tabUrl}

All Open Tabs:
${allTabsContext}

User: ${lastUserMsg}

If you want to take an action, respond with:
ACTION: <action> <parameters>
Available actions: close_tab <tab_id>, open_tab <url>, switch_tab <tab_id>.
Otherwise, just answer as usual.`;

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful Chrome-extension agent. Use the tab context to assist the user and suggest actions when helpful.'
            },
            ...request.messages,
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!openaiRes.ok) {
        const txt = await openaiRes.text();
        throw new Error(`OpenAI error ${openaiRes.status}: ${txt}`);
      }

      const openaiData = await openaiRes.json();
      let reply = openaiData.choices?.[0]?.message?.content || 'No response from OpenAI.';

      if (reply.startsWith('ACTION:')) {
        const [, action, ...params] = reply.split(/\s+/);
        const arg = params.join(' ').trim();
        switch (action) {
          case 'close_tab': {
            const id = parseInt(arg, 10);
            if (!Number.isNaN(id)) chrome.tabs.remove(id);
            break;
          }
          case 'open_tab':
            if (arg) chrome.tabs.create({ url: arg });
            break;
          case 'switch_tab': {
            const id = parseInt(arg, 10);
            if (!Number.isNaN(id)) chrome.tabs.update(id, { active: true });
            break;
          }
        }
        reply = reply.split('\n').slice(1).join('\n').trim();
      }

      const { error: insertErr } = await sb.from('chat_logs').insert([
        {
          user_message: lastUserMsg,
          openai_response: reply,
          tab_url: request.tabUrl || '',
          tab_title: request.tabTitle || ''
        }
      ]);
      if (insertErr) console.error('Supabase insert error:', insertErr);

      sendResponse({ reply });
    } catch (err) {
      console.error(err);
      sendResponse({ reply: 'Error: ' + err.message });
    }
    return true;
  }

  if (request.type === 'fetchChatHistory') {
    try {
      const { data, error } = await sb
        .from('chat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      sendResponse({ history: data || [] });
    } catch (err) {
      console.error(err);
      sendResponse({ history: [], error: err.message });
    }
    return true;
  }
});