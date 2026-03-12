import { TestBed } from '@angular/core/testing';

import { ChatUi } from './chat-ui';

describe('ChatUi', () => {
  let service: ChatUi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatUi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
