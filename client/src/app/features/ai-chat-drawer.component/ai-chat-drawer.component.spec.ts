import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiChatDrawerComponent } from './ai-chat-drawer.component';

describe('AiChatDrawerComponent', () => {
  let component: AiChatDrawerComponent;
  let fixture: ComponentFixture<AiChatDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiChatDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiChatDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
