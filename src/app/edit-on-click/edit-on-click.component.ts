import {Component, OnInit} from '@angular/core';
import {Input} from '@angular/core';
import {Output} from '@angular/core';
import {EventEmitter} from '@angular/core';
import {ElementRef} from '@angular/core';

@Component({
  selector: 'sup-edit-on-click',
  templateUrl: './edit-on-click.component.html',
  styleUrls: ['./edit-on-click.component.scss']
})
export class EditOnClickComponent implements OnInit {
  @Input() value: string;
  @Input() eventId: string;
  @Output() editFinished: EventEmitter<any> = new EventEmitter();
  modelCopy: string;
  isShowEdit: boolean;
  inputEl: HTMLInputElement;
  textEl: HTMLElement;
  el: HTMLElement;


  constructor(el: ElementRef) {
    this.el = el.nativeElement;
  }

  ngOnInit() {
    this.textEl = this.el.querySelectorAll('div')[0];
  }

  toggleShowEdit() {
    this.textEl.style.display = 'none';
    this.isShowEdit = true;
    this.modelCopy = this.value;
    setTimeout(() => {
      this.inputEl = this.el.querySelectorAll('input')[0];
      this.inputEl.focus();
      this.inputEl.value = this.modelCopy;
    });
  }

  finishEdit() {
    this.modelCopy = this.inputEl.value;

    const isChanged = (this.value !== this.modelCopy);
    if (isChanged) {
      // update if changes were made
      this.value = this.modelCopy;
    }

    // check for show edit to only trigger once
    // if (this.isShowEdit && typeof this.editFinished === "function") {
    if (this.isShowEdit) {
      this.editFinished.emit({isChanged, newVal: this.value});
    }

    this.isShowEdit = false;
    this.textEl.style.display = 'block';
  }


  // clickToggleEvHandler(ev, eventId) {
  //   if (eventId === vm.editOnClickEvId) {
  //     vm.toggleShowEdit();
  //   }
  // }
  //
  // $scope.$on(EDIT_ON_CLICK_TOGGLE_EV, clickToggleEvHandler);
}
