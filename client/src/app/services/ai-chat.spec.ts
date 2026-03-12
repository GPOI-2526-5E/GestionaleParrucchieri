import { TestBed } from '@angular/core/testing';

import { AiChat } from './ai-chat';

describe('AiChat', () => {
  let service: AiChat;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiChat);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
