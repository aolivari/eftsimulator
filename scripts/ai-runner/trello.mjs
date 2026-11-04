import { getTrelloConfig } from './config.mjs';

export class TrelloClient {
  constructor() {
    const { apiKey, token, boardId } = getTrelloConfig();
    this.apiKey = apiKey;
    this.token = token;
    this.boardId = boardId;
    this.baseUrl = 'https://api.trello.com/1';
  }

  async _request(endpoint, options = {}) {
    const delimiter = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${endpoint}${delimiter}key=${this.apiKey}&token=${this.token}`;
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Trello API error (${res.status}): ${errText}`);
    }
    return res.json();
  }

  async getBoardInfo() {
    return this._request(`/boards/${this.boardId}`);
  }

  async getLists() {
    return this._request(`/boards/${this.boardId}/lists`);
  }

  async getCardsInList(listId) {
    return this._request(`/lists/${listId}/cards?attachments=true`);
  }

  async moveCard(cardId, targetListId) {
    return this._request(`/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idList: targetListId }),
    });
  }

  async addComment(cardId, text) {
    return this._request(`/cards/${cardId}/actions/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }
}
