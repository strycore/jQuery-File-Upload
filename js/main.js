/*
 * jQuery File Upload Plugin JS Example 8.9.1
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010-2015, Sebastian Tschan
 * Copyright 2012, Agustín Amenabar
 * Copyright 2015, Mathieu Comandon
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/* global $, window */

$(function () {
  'use strict';

  var config = {
    demoHostname: 'blueimp.github.io',
    uploadUrl: 'server/php/',
    uploadAndCropUrl: 'server/php/image_crop_and_size.php'
  };

  var zclipInitialized = false;
  var $activeImage;
  var $fileUpload = $('#fileupload');
  var $inWidthCrop = $('#inWidthCrop');
  var $inHeightCrop = $('#inHeightCrop');
  var cropCoordinates = {};

  function loadExistingFiles(){
    $fileUpload.each(function () {
      var that = this;
      $.getJSON(this.action, function (result) {
        if (result && result.length) {
          $(that).fileupload('option', 'done')
            .call(that, null, {result: result});
        }
      });
    });
  }

  function afterCropping() {
    $('#croppingModal').modal('hide');
    $('tbody.files').find('tr').remove();
    loadExistingFiles();
  }

  function afterResize() {
    $('#modal-gallery').modal('hide');
    $('#startCrop, #startResize, #inWidthCrop, #inHeightCrop').removeAttr('disabled');
    $('tbody.files').find('tr').remove();
    loadExistingFiles();
  }

  function initZClip() {
    if (zclipInitialized) {
      return;
    }
    $('a.modal-copy').zclip({
      path: 'js/ZeroClipboard.swf',
      copy: function () {
        return $('#urlImage').val();
      }
    });
    zclipInitialized = true;
  }

  function enableStartResize(activar) {
    var $targ = $('#startResize');
    if (activar) {
      $targ.removeAttr('disabled');
    } else {
      $targ.attr('disabled', 'disabled');
    }
  }

  // Initialize the jQuery File Upload widget:
  $fileUpload.fileupload({
    // Uncomment the following to send cross-domain cookies:
    //xhrFields: {withCredentials: true},
    url: config.uploadUrl
  });

  // Enable iframe cross-domain access via redirect option:
  $fileUpload.fileupload(
    'option',
    'redirect',
    window.location.href.replace(
      /\/[^\/]*$/,
      '/cors/result.html?%s'
    )
  );

  if (window.location.hostname === config.demoHostname) {
    // Demo settings:
    $fileUpload.fileupload('option', {
      url: '//jquery-file-upload.appspot.com/',
      // Enable image resizing, except for Android and Opera,
      // which actually support image resizing, but fail to
      // send Blob objects via XHR requests:
      disableImageResize: /Android(?!.*Chrome)|Opera/
        .test(window.navigator.userAgent),
      maxFileSize: 5000000,
      acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i
    });
    // Upload server status check for browsers with CORS support:
    if ($.support.cors) {
      $.ajax({
        url: '//jquery-file-upload.appspot.com/',
        type: 'HEAD'
      }).fail(function () {
        $('<div class="alert alert-danger"/>')
          .text('Upload server currently unavailable - ' + new Date())
          .appendTo('#fileupload');
      });
    }
  } else {
    // Load existing files:
    $fileUpload.addClass('fileupload-processing');
    $.ajax({
      // Uncomment the following to send cross-domain cookies:
      //xhrFields: {withCredentials: true},
      url: $fileUpload.fileupload('option', 'url'),
      dataType: 'json',
      context: $fileUpload[0]
    }).always(function () {
      $(this).removeClass('fileupload-processing');
    }).done(function (result) {
      $(this).fileupload('option', 'done')
        .call(this, $.Event('done'), {result: result});
    });
  }

  /***************** added by Agustín Amenabar *************************/
  $('#modal-gallery').on('displayed', function () {
    var modalData = $(this).data('modal');
    var $croppingModal = $('#croppingModal');
    var $modalGallery = $('#modal-gallery');
    var $urlImage = $('#urlImage');
    var $canvasToCrop = $('#canvasToCrop');

    // modalData.$links is the list of (filtered) element nodes as jQuery object
    // modalData.img is the img (or canvas) element for the loaded image
    // modalData.options.index is the index of the current link
    initZClip();
    $urlImage.css('vertical-align', 'top');
    $activeImage = $(modalData.img);
    $urlImage.val($activeImage.attr('src'));

    $inWidthCrop.val($croppingModal.attr('data-width'));
    $inHeightCrop.val($croppingModal.attr('data-height'));

    $('#startCrop').click(function (ev) {
      ev.preventDefault();
      var cssProperties = ['margin-left', 'margin-top', 'width'];
      for (var i = cssProperties.length - 1; i >= 0; i--) {
        $croppingModal.css(cssProperties[i], $('#modal-gallery').css(cssProperties[i]));
      }
      $croppingModal.find('.modal-body').css('max-height', 'none');
      $croppingModal.modal('show').find('.close, .closeModal').click(function (ev) {
        ev.preventDefault();
        $croppingModal.modal('hide');
      });
      $modalGallery.modal('hide');

      var picWidth = $activeImage.width();
      var picHeight = $activeImage.height();
      if (!picWidth) {
        return;
      }
      $canvasToCrop.attr('width', picWidth);
      $canvasToCrop.attr('height', picHeight);

      var canContext = $canvasToCrop[0].getContext('2d');
      canContext.drawImage($activeImage[0], 0, 0, picWidth, picHeight);

      var jcOptions = {};

      var inWidthCrop = $inWidthCrop.val();
      var inHeightCrop = $inHeightCrop.val();
      if (inWidthCrop && inHeightCrop) {
        jcOptions.aspectRatio = inWidthCrop / inHeightCrop;
        $croppingModal.find('h3 .dimentions').text('to ' + inWidthCrop + ' x ' + inHeightCrop + ' px');
      }

      cropCoordinates.source = {
        width: picWidth,
        height: picHeight,
        endWidth: inWidthCrop,
        endHeight: inHeightCrop,
        file: $activeImage.attr('src')
      };
      jcOptions.onSelect = function (c) {
        cropCoordinates.c = c;
      };

      $('#canvasToCrop').Jcrop(jcOptions);
    });
    $('#opCrop').find('button[type=reset]').click(function () {
      enableStartResize(false);
    });
    $inWidthCrop.change(function () {
      if (!$(this).val() || $(this).val() === '0') {
        enableStartResize(false);
        $inHeightCrop.val('');
      } else {
        enableStartResize(true);
      }
    });
    $inHeightCrop.change(function () {
      if (!$(this).val() || $(this).val() === '0') {
        enableStartResize(false);
        $inWidthCrop.val('');
      } else {
        enableStartResize(true);
      }
    });
  });
  $('#btnDoCrop').click(function (ev) {
    ev.preventDefault();
    $.post(config.uploadAndCropUrl, cropCoordinates, afterCropping);
  });
  $('#startResize').click(function () {
    var noSize = true;
    var resizeData = {file: $activeImage.attr('src')};
    if ($inWidthCrop.val() && $inWidthCrop.val() !== '0') {
      resizeData.width = $('#inWidthCrop').val();
      noSize = false;
    }
    if ($inHeightCrop.val() && $inHeightCrop.val() !== '0') {
      resizeData.height = $inHeightCrop.val();
      noSize = false;
    }
    if (noSize) {
      //there's no width nor height defined to do the resize.
      return;
    }
    $('#startCrop, #startResize, #inWidthCrop, #inHeightCrop').attr('disabled', 'disabled');
    $.post(config.uploadAndCropUrl, resizeData, afterResize);
  });
});

/*
 * Special event for image load events
 * Needed because some browsers does not trigger the event on cached images.

 * MIT License
 * Paul Irish     | @paul_irish | www.paulirish.com
 * Andree Hansson | @peolanha   | www.andreehansson.se
 * 2010.
 *
 * Usage:
 * $(images).bind('load', function (e) {
 *   // Do stuff on load
 * });
 *
 * Note that you can bind the 'error' event on data uri images, this will trigger when
 * data uri images isn't supported.
 *
 * Tested in:
 * FF 3+
 * IE 6-8
 * Chromium 5-6
 * Opera 9-10
 */
(function ($) {
  $.event.special.load = {
    add: function (hollaback) {
      if (this.nodeType === 1 && this.tagName.toLowerCase() === 'img' && this.src !== '') {
        // Image is already complete, fire the hollaback (fixes browser issues were cached
        // images isn't triggering the load event)
        if (this.complete || this.readyState === 4) {
          hollaback.handler.apply(this);
        }

        // Check if data URI images is supported, fire 'error' event if not
        else if (this.readyState === 'uninitialized' && this.src.indexOf('data:') === 0) {
          $(this).trigger('error');
        }

        else {
          $(this).bind('load', hollaback.handler);
        }
      }
    }
  };
}(jQuery));
