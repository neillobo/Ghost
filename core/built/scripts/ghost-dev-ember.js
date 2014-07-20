define("ghost/adapters/app", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var AppAdapter = DS.FixtureAdapter.extend({});

    __exports__["default"] = AppAdapter;
  });
define("ghost/adapters/application", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    // export default DS.FixtureAdapter.extend({});

    var ApplicationAdapter = DS.RESTAdapter.extend({
        host: window.location.origin,
        namespace: ghostPaths().apiRoot.slice(1),

        findQuery: function (store, type, query) {
            var id;

            if (query.id) {
                id = query.id;
                delete query.id;
            }

            return this.ajax(this.buildURL(type.typeKey, id), 'GET', { data: query });
        },

        buildURL: function (type, id) {
            // Ensure trailing slashes
            var url = this._super(type, id);

            if (url.slice(-1) !== '/') {
                url += '/';
            }

            return url;
        },

        // Override deleteRecord to disregard the response body on 2xx responses.
        // This is currently needed because the API is returning status 200 along
        // with the JSON object for the deleted entity and Ember expects an empty
        // response body for successful DELETEs.
        // Non-2xx (failure) responses will still work correctly as Ember will turn
        // them into rejected promises.
        deleteRecord: function () {
            var response = this._super.apply(this, arguments);

            return response.then(function () {
                return null;
            });
        }
    });

    __exports__["default"] = ApplicationAdapter;
  });
define("ghost/adapters/post", 
  ["ghost/adapters/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationAdapter = __dependency1__["default"];

    var PostAdapter = ApplicationAdapter.extend({
        createRecord: function (store, type, record) {
            var data = {},
                serializer = store.serializerFor(type.typeKey),
                url = this.buildURL(type.typeKey);

            // make the server return with the tags embedded
            url = url + '?include=tags';

            // use the PostSerializer to transform the model back into
            // an array with a post object like the API expects
            serializer.serializeIntoHash(data, type, record);

            return this.ajax(url, 'POST', { data: data });
        },

        updateRecord: function (store, type, record) {
            var data = {},
                serializer = store.serializerFor(type.typeKey),
                id = Ember.get(record, 'id'),
                url = this.buildURL(type.typeKey, id);

            // make the server return with the tags embedded
            url = url + '?include=tags';

            // use the PostSerializer to transform the model back into
            // an array of posts objects like the API expects
            serializer.serializeIntoHash(data, type, record);

            // use the ApplicationAdapter's buildURL method
            return this.ajax(url, 'PUT', { data: data });
        }
    });

    __exports__["default"] = PostAdapter;
  });
define("ghost/adapters/setting", 
  ["ghost/adapters/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationAdapter = __dependency1__["default"];

    var SettingAdapter = ApplicationAdapter.extend({
        updateRecord: function (store, type, record) {
            var data = {},
                serializer = store.serializerFor(type.typeKey);

            // remove the fake id that we added onto the model.
            delete record.id;

            // use the SettingSerializer to transform the model back into
            // an array of settings objects like the API expects
            serializer.serializeIntoHash(data, type, record);

            // use the ApplicationAdapter's buildURL method but do not
            // pass in an id.
            return this.ajax(this.buildURL(type.typeKey), 'PUT', { data: data });
        }
    });

    __exports__["default"] = SettingAdapter;
  });
define("ghost/app", 
  ["ember/resolver","ghost/fixtures/init","ember/load-initializers","ghost/utils/link-view","ghost/utils/text-field","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var Resolver = __dependency1__["default"];
    var initFixtures = __dependency2__["default"];
    var loadInitializers = __dependency3__["default"];

    Ember.MODEL_FACTORY_INJECTIONS = true;

    var App = Ember.Application.extend({
        /**
         * These are debugging flags, they are useful during development
         */
        LOG_ACTIVE_GENERATION: true,
        LOG_MODULE_RESOLVER: true,
        LOG_TRANSITIONS: true,
        LOG_TRANSITIONS_INTERNAL: true,
        LOG_VIEW_LOOKUPS: true,
        modulePrefix: 'ghost',
        Resolver: Resolver['default']
    });

    initFixtures();

    loadInitializers(App, 'ghost');

    __exports__["default"] = App;
  });
define("ghost/assets/lib/touch-editor", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var createTouchEditor = function createTouchEditor() {
        var noop = function () {},
            TouchEditor;

        TouchEditor = function (el, options) {
            /*jshint unused:false*/
            this.textarea = el;
            this.win = { document : this.textarea };
            this.ready = true;
            this.wrapping = document.createElement('div');

            var textareaParent = this.textarea.parentNode;
            this.wrapping.appendChild(this.textarea);
            textareaParent.appendChild(this.wrapping);

            this.textarea.style.opacity = 1;
        };

        TouchEditor.prototype = {
            setOption: function (type, handler) {
                if (type === 'onChange') {
                    $(this.textarea).change(handler);
                }
            },
            eachLine: function () {
                return [];
            },
            getValue: function () {
                return this.textarea.value;
            },
            setValue: function (code) {
                this.textarea.value = code;
            },
            focus: noop,
            getCursor: function () {
                return { line: 0, ch: 0 };
            },
            setCursor: noop,
            currentLine: function () {
                return 0;
            },
            cursorPosition: function () {
                return { character: 0 };
            },
            addMarkdown: noop,
            nthLine: noop,
            refresh: noop,
            selectLines: noop,
            on: noop,
            off: noop
        };

        return TouchEditor;
    };

    __exports__["default"] = createTouchEditor;
  });
define("ghost/assets/lib/uploader", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    var UploadUi,
        upload,
        Ghost = ghostPaths();


    UploadUi = function ($dropzone, settings) {
        var $url = '<div class="js-url"><input class="url js-upload-url" type="url" placeholder="http://"/></div>',
            $cancel = '<a class="image-cancel js-cancel" title="Delete"><span class="hidden">Delete</span></a>',
            $progress =  $('<div />', {
                'class' : 'js-upload-progress progress progress-success active',
                'role': 'progressbar',
                'aria-valuemin': '0',
                'aria-valuemax': '100'
            }).append($('<div />', {
                'class': 'js-upload-progress-bar bar',
                'style': 'width:0%'
            }));

        $.extend(this, {
            complete: function (result) {
                var self = this;

                function showImage(width, height) {
                    $dropzone.find('img.js-upload-target').attr({'width': width, 'height': height}).css({'display': 'block'});
                    $dropzone.find('.fileupload-loading').remove();
                    $dropzone.css({'height': 'auto'});
                    $dropzone.delay(250).animate({opacity: 100}, 1000, function () {
                        $('.js-button-accept').prop('disabled', false);
                        self.init();
                    });
                }

                function animateDropzone($img) {
                    $dropzone.animate({opacity: 0}, 250, function () {
                        $dropzone.removeClass('image-uploader').addClass('pre-image-uploader');
                        $dropzone.css({minHeight: 0});
                        self.removeExtras();
                        $dropzone.animate({height: $img.height()}, 250, function () {
                            showImage($img.width(), $img.height());
                        });
                    });
                }

                function preLoadImage() {
                    var $img = $dropzone.find('img.js-upload-target')
                        .attr({'src': '', 'width': 'auto', 'height': 'auto'});

                    $progress.animate({'opacity': 0}, 250, function () {
                        $dropzone.find('span.media').after('<img class="fileupload-loading"  src="' + Ghost.subdir + '/ghost/img/loadingcat.gif" />');
                        if (!settings.editor) {$progress.find('.fileupload-loading').css({'top': '56px'}); }
                    });
                    $dropzone.trigger('uploadsuccess', [result]);
                    $img.one('load', function () {
                        animateDropzone($img);
                    }).attr('src', result);
                }
                preLoadImage();
            },

            bindFileUpload: function () {
                var self = this;

                $dropzone.find('.js-fileupload').fileupload().fileupload('option', {
                    url: Ghost.subdir + '/ghost/api/v0.1/uploads/',
                    add: function (e, data) {
                        /*jshint unused:false*/
                        $('.js-button-accept').prop('disabled', true);
                        $dropzone.find('.js-fileupload').removeClass('right');
                        $dropzone.find('.js-url').remove();
                        $progress.find('.js-upload-progress-bar').removeClass('fail');
                        $dropzone.trigger('uploadstart', [$dropzone.attr('id')]);
                        $dropzone.find('span.media, div.description, a.image-url, a.image-webcam')
                            .animate({opacity: 0}, 250, function () {
                                $dropzone.find('div.description').hide().css({'opacity': 100});
                                if (settings.progressbar) {
                                    $dropzone.find('div.js-fail').after($progress);
                                    $progress.animate({opacity: 100}, 250);
                                }
                                data.submit();
                            });
                    },
                    dropZone: settings.fileStorage ? $dropzone : null,
                    progressall: function (e, data) {
                        /*jshint unused:false*/
                        var progress = parseInt(data.loaded / data.total * 100, 10);
                        if (!settings.editor) {$progress.find('div.js-progress').css({'position': 'absolute', 'top': '40px'}); }
                        if (settings.progressbar) {
                            $dropzone.trigger('uploadprogress', [progress, data]);
                            $progress.find('.js-upload-progress-bar').css('width', progress + '%');
                        }
                    },
                    fail: function (e, data) {
                        /*jshint unused:false*/
                        $('.js-button-accept').prop('disabled', false);
                        $dropzone.trigger('uploadfailure', [data.result]);
                        $dropzone.find('.js-upload-progress-bar').addClass('fail');
                        if (data.jqXHR.status === 413) {
                            $dropzone.find('div.js-fail').text('The image you uploaded was larger than the maximum file size your server allows.');
                        } else if (data.jqXHR.status === 415) {
                            $dropzone.find('div.js-fail').text('The image type you uploaded is not supported. Please use .PNG, .JPG, .GIF, .SVG.');
                        } else {
                            $dropzone.find('div.js-fail').text('Something went wrong :(');
                        }
                        $dropzone.find('div.js-fail, button.js-fail').fadeIn(1500);
                        $dropzone.find('button.js-fail').on('click', function () {
                            $dropzone.css({minHeight: 0});
                            $dropzone.find('div.description').show();
                            self.removeExtras();
                            self.init();
                        });
                    },
                    done: function (e, data) {
                        /*jshint unused:false*/
                        self.complete(data.result);
                    }
                });
            },

            buildExtras: function () {
                if (!$dropzone.find('span.media')[0]) {
                    $dropzone.prepend('<span class="media"><span class="hidden">Image Upload</span></span>');
                }
                if (!$dropzone.find('div.description')[0]) {
                    $dropzone.append('<div class="description">Add image</div>');
                }
                if (!$dropzone.find('div.js-fail')[0]) {
                    $dropzone.append('<div class="js-fail failed" style="display: none">Something went wrong :(</div>');
                }
                if (!$dropzone.find('button.js-fail')[0]) {
                    $dropzone.append('<button class="js-fail button-add" style="display: none">Try Again</button>');
                }
                if (!$dropzone.find('a.image-url')[0]) {
                    $dropzone.append('<a class="image-url" title="Add image from URL"><span class="hidden">URL</span></a>');
                }
    //                if (!$dropzone.find('a.image-webcam')[0]) {
    //                    $dropzone.append('<a class="image-webcam" title="Add image from webcam"><span class="hidden">Webcam</span></a>');
    //                }
            },

            removeExtras: function () {
                $dropzone.find('span.media, div.js-upload-progress, a.image-url, a.image-upload, a.image-webcam, div.js-fail, button.js-fail, a.js-cancel').remove();
            },

            initWithDropzone: function () {
                var self = this;
                //This is the start point if no image exists
                $dropzone.find('img.js-upload-target').css({'display': 'none'});
                $dropzone.removeClass('pre-image-uploader image-uploader-url').addClass('image-uploader');
                this.removeExtras();
                this.buildExtras();
                this.bindFileUpload();
                if (!settings.fileStorage) {
                    self.initUrl();
                    return;
                }
                $dropzone.find('a.image-url').on('click', function () {
                    self.initUrl();
                });
            },
            initUrl: function () {
                var self = this, val;
                this.removeExtras();
                $dropzone.addClass('image-uploader-url').removeClass('pre-image-uploader');
                $dropzone.find('.js-fileupload').addClass('right');
                if (settings.fileStorage) {
                    $dropzone.append($cancel);
                }
                $dropzone.find('.js-cancel').on('click', function () {
                    $dropzone.find('.js-url').remove();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    self.removeExtras();
                    self.initWithDropzone();
                });

                $dropzone.find('div.description').before($url);

                if (settings.editor) {
                    $dropzone.find('div.js-url').append('<button class="js-button-accept button-save">Save</button>');
                }

                $dropzone.find('.js-button-accept').on('click', function () {
                    val = $dropzone.find('.js-upload-url').val();
                    $dropzone.find('div.description').hide();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    $dropzone.find('.js-url').remove();
                    if (val === '') {
                        $dropzone.trigger('uploadsuccess', 'http://');
                        self.initWithDropzone();
                    } else {
                        self.complete(val);
                    }
                });

                // Only show the toggle icon if there is a dropzone mode to go back to
                if (settings.fileStorage !== false) {
                    $dropzone.append('<a class="image-upload" title="Add image"><span class="hidden">Upload</span></a>');
                }

                $dropzone.find('a.image-upload').on('click', function () {
                    $dropzone.find('.js-url').remove();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    self.initWithDropzone();
                });

            },
            initWithImage: function () {
                var self = this;
                // This is the start point if an image already exists
                $dropzone.removeClass('image-uploader image-uploader-url').addClass('pre-image-uploader');
                $dropzone.find('div.description').hide();
                $dropzone.append($cancel);
                $dropzone.find('.js-cancel').on('click', function () {
                    $dropzone.find('img.js-upload-target').attr({'src': ''});
                    $dropzone.find('div.description').show();
                    $dropzone.delay(2500).animate({opacity: 100}, 1000, function () {
                        self.init();
                    });

                    $dropzone.trigger('uploadsuccess', 'http://');
                    self.initWithDropzone();
                });
            },

            init: function () {
                var imageTarget = $dropzone.find('img.js-upload-target');
                // First check if field image is defined by checking for js-upload-target class
                if (!imageTarget[0]) {
                    // This ensures there is an image we can hook into to display uploaded image
                    $dropzone.prepend('<img class="js-upload-target" style="display: none"  src="" />');
                }
                $('.js-button-accept').prop('disabled', false);
                if (imageTarget.attr('src') === '' || imageTarget.attr('src') === undefined) {
                    this.initWithDropzone();
                } else {
                    this.initWithImage();
                }
            }
        });
    };


    upload = function (options) {
        var settings = $.extend({
            progressbar: true,
            editor: false,
            fileStorage: true
        }, options);
        return this.each(function () {
            var $dropzone = $(this),
                ui;

            ui = new UploadUi($dropzone, settings);
            ui.init();
        });
    };

    __exports__["default"] = upload;
  });
define("ghost/components/gh-activating-list-item", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ActivatingListItem = Ember.Component.extend({
        tagName: 'li',
        classNameBindings: ['active'],
        active: false
    });

    __exports__["default"] = ActivatingListItem;
  });
define("ghost/components/gh-blur-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var BlurInput = Ember.TextField.extend({
        selectOnClick: false,
        click: function (event) {
            if (this.get('selectOnClick')) {
                event.currentTarget.select();
            }
        },
        focusOut: function () {
            this.sendAction('action', this.get('value'));
        }
    });

    __exports__["default"] = BlurInput;
  });
define("ghost/components/gh-codemirror", 
  ["ghost/mixins/marker-manager","ghost/utils/codemirror-mobile","ghost/utils/set-scroll-classname","ghost/utils/codemirror-shortcuts","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    /*global CodeMirror */

    var MarkerManager = __dependency1__["default"];
    var mobileCodeMirror = __dependency2__["default"];
    var setScrollClassName = __dependency3__["default"];
    var codeMirrorShortcuts = __dependency4__["default"];

    codeMirrorShortcuts.init();

    var onChangeHandler = function (cm, changeObj) {
        var line,
            component = cm.component,
            checkLine = _.bind(component.checkLine, component),
            checkMarkers = _.bind(component.checkMarkers, component);

        // fill array with a range of numbers
        for (line = changeObj.from.line; line < changeObj.from.line + changeObj.text.length; line += 1) {
            checkLine(line, changeObj.origin);
        }

        // Is this a line which may have had a marker on it?
        checkMarkers();

        cm.component.set('value', cm.getValue());
    };

    var onScrollHandler = function (cm) {
        var scrollInfo = cm.getScrollInfo(),
            component = cm.component;

        scrollInfo.codemirror = cm;

        // throttle scroll updates
        component.throttle = Ember.run.throttle(component, function () {
            this.set('scrollInfo', scrollInfo);
        }, 10);
    };

    var Codemirror = Ember.TextArea.extend(MarkerManager, {
        didInsertElement: function () {
            Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
        },

        afterRenderEvent: function () {
            var initMarkers = _.bind(this.initMarkers, this);

            // Allow tabbing behaviour when viewing on small screen (not mobile)
            $('.floatingheader').on('click', function () {
                $('.entry-markdown').toggleClass('active');
                $('.entry-preview').toggleClass('active');
            });

            // replaces CodeMirror with TouchEditor only if we're on mobile
            mobileCodeMirror.createIfMobile();

            this.initCodemirror();
            this.codemirror.eachLine(initMarkers);
            this.sendAction('setCodeMirror', this);
        },

        // this needs to be placed on the 'afterRender' queue otherwise CodeMirror gets wonky
        initCodemirror: function () {
            // create codemirror
            var codemirror = CodeMirror.fromTextArea(this.get('element'), {
                mode:           'gfm',
                tabMode:        'indent',
                tabindex:       '2',
                cursorScrollMargin: 10,
                lineWrapping:   true,
                dragDrop:       false,
                extraKeys: {
                    Home:   'goLineLeft',
                    End:    'goLineRight'
                }
            });

            codemirror.component = this; // save reference to this

            // propagate changes to value property
            codemirror.on('change', onChangeHandler);

            // on scroll update scrollPosition property
            codemirror.on('scroll', onScrollHandler);

            codemirror.on('scroll', Ember.run.bind(Ember.$('.CodeMirror-scroll'), setScrollClassName, {
                target: Ember.$('.entry-markdown'),
                offset: 10
            }));

            this.set('codemirror', codemirror);
        },

        disableCodeMirror: function () {
            var codemirror = this.get('codemirror');

            codemirror.setOption('readOnly', 'nocursor');
            codemirror.off('change', onChangeHandler);
        },

        enableCodeMirror: function () {
            var codemirror = this.get('codemirror');

            codemirror.setOption('readOnly', false);

            // clicking the trash button on an image dropzone causes this function to fire.
            // this line is a hack to prevent multiple event handlers from being attached.
            codemirror.off('change', onChangeHandler);

            codemirror.on('change', onChangeHandler);
        },

        removeThrottle: function () {
            Ember.run.cancel(this.throttle);
        }.on('willDestroyElement'),

        removeCodemirrorHandlers: function () {
            // not sure if this is needed.
            var codemirror = this.get('codemirror');
            codemirror.off('change', onChangeHandler);
            codemirror.off('scroll');
        }.on('willDestroyElement'),

        clearMarkerManagerMarkers: function () {
            this.clearMarkers();
        }.on('willDestroyElement')
    });

    __exports__["default"] = Codemirror;
  });
define("ghost/components/gh-file-upload", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var FileUpload = Ember.Component.extend({
        _file: null,

        uploadButtonText: 'Text',

        uploadButtonDisabled: true,

        change: function (event) {
            this.set('uploadButtonDisabled', false);
            this.sendAction('onAdd');
            this._file = event.target.files[0];
        },

        onUpload: 'onUpload',

        actions: {
            upload: function () {
                if (!this.uploadButtonDisabled && this._file) {
                    this.sendAction('onUpload', this._file);
                }

                // Prevent double post by disabling the button.
                this.set('uploadButtonDisabled', true);
            }
        }
    });

    __exports__["default"] = FileUpload;
  });
define("ghost/components/gh-form", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Form = Ember.View.extend({
        tagName: 'form',
        attributeBindings: ['enctype'],
        reset: function () {
            this.$().get(0).reset();
        },
        didInsertElement: function () {
            this.get('controller').on('reset', this, this.reset);
        },
        willClearRender: function () {
            this.get('controller').off('reset', this, this.reset);
        }
    });

    __exports__["default"] = Form;
  });
define("ghost/components/gh-markdown", 
  ["ghost/assets/lib/uploader","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var uploader = __dependency1__["default"];

    var Markdown = Ember.Component.extend({
        classNames: ['rendered-markdown'],

        didInsertElement: function () {
            this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
        },

        adjustScrollPosition: function () {
            var scrollWrapper = this.get('scrollWrapper'),
                scrollPosition = this.get('scrollPosition');

            scrollWrapper.scrollTop(scrollPosition);
        }.observes('scrollPosition'),

        // fire off 'enable' API function from uploadManager
        // might need to make sure markdown has been processed first
        reInitDropzones: function () {
            Ember.run.scheduleOnce('afterRender', this, function () {
                var dropzones = $('.js-drop-zone');

                uploader.call(dropzones, {
                    editor: true,
                    fileStorage: this.get('config.fileStorage')
                });

                dropzones.on('uploadstart', _.bind(this.sendAction, this, 'uploadStarted'));
                dropzones.on('uploadfailure', _.bind(this.sendAction, this, 'uploadFinished'));
                dropzones.on('uploadsuccess', _.bind(this.sendAction, this, 'uploadFinished'));
                dropzones.on('uploadsuccess', _.bind(this.sendAction, this, 'uploadSuccess'));
            });
        }.observes('markdown')
    });

    __exports__["default"] = Markdown;
  });
define("ghost/components/gh-modal-dialog", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ModalDialog = Ember.Component.extend({
        didInsertElement: function () {
            this.$('#modal-container').fadeIn(50);

            this.$('.modal-background').show().fadeIn(10, function () {
                $(this).addClass('in');
            });

            this.$('.js-modal').addClass('in');
        },

        willDestroyElement: function () {

            this.$('.js-modal').removeClass('in');

            this.$('.modal-background').removeClass('in');

            return this._super();
        },

        confirmaccept: 'confirmAccept',
        confirmreject: 'confirmReject',

        actions: {
            closeModal: function () {
                this.sendAction();
            },
            confirm: function (type) {
                this.sendAction('confirm' + type);
                this.sendAction();
            }
        },

        klass: function () {
            var classNames = [];

            classNames.push(this.get('type') ? 'modal-' + this.get('type') : 'modal');

            if (this.get('style')) {
                this.get('style').split(',').forEach(function (style) {
                    classNames.push('modal-style-' + style);
                });
            }

            classNames.push(this.get('animation'));

            return classNames.join(' ');
        }.property('type', 'style', 'animation'),

        acceptButtonClass: function () {
            return this.get('confirm.accept.buttonClass') ? this.get('confirm.accept.buttonClass') : 'button-add';
        }.property('confirm.accept.buttonClass'),

        rejectButtonClass: function () {
            return this.get('confirm.reject.buttonClass') ? this.get('confirm.reject.buttonClass') : 'button-delete';
        }.property('confirm.reject.buttonClass')
    });

    __exports__["default"] = ModalDialog;
  });
define("ghost/components/gh-notification", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NotificationComponent = Ember.Component.extend({
        classNames: ['js-bb-notification'],

        typeClass: function () {
            var classes = '',
                message = this.get('message'),
                type,
                dismissible;

            // Check to see if we're working with a DS.Model or a plain JS object
            if (typeof message.toJSON === 'function') {
                type = message.get('type');
                dismissible = message.get('dismissible');
            }
            else {
                type = message.type;
                dismissible = message.dismissible;
            }

            classes += 'notification-' + type;

            if (type === 'success' && dismissible !== false) {
                classes += ' notification-passive';
            }

            return classes;
        }.property(),

        didInsertElement: function () {
            var self = this;

            self.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
                /* jshint unused: false */
                if (event.originalEvent.animationName === 'fade-out') {
                    self.notifications.removeObject(self.get('message'));
                }
            });
        },

        actions: {
            closeNotification: function () {
                var self = this;
                self.notifications.closeNotification(self.get('message'));
            }
        }
    });

    __exports__["default"] = NotificationComponent;
  });
define("ghost/components/gh-notifications", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NotificationsComponent = Ember.Component.extend({
        tagName: 'aside',
        classNames: 'notifications',
        classNameBindings: ['location'],

        messages: Ember.computed.filter('notifications', function (notification) {
            // If this instance of the notifications component has no location affinity
            // then it gets all notifications
            if (!this.get('location')) {
                return true;
            }

            var displayLocation = (typeof notification.toJSON === 'function') ?
                notification.get('location') : notification.location;

            return this.get('location') === displayLocation;
        }),

        messageCountObserver: function () {
            this.sendAction('notify', this.get('messages').length);
        }.observes('messages.[]')
    });

    __exports__["default"] = NotificationsComponent;
  });
define("ghost/components/gh-popover-button", 
  ["ghost/mixins/popover-mixin","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var PopoverMixin = __dependency1__["default"];

    var PopoverButton = Ember.Component.extend(PopoverMixin, {
        tagName: 'button',
        /*matches with the popover this button toggles*/
        popoverName: null,
        /*Notify popover service this popover should be toggled*/
        click: function (event) {
            this._super(event);
            this.get('popover').togglePopover(this.get('popoverName'));
        }
    });

    __exports__["default"] = PopoverButton;
  });
define("ghost/components/gh-popover", 
  ["ghost/mixins/popover-mixin","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var PopoverMixin = __dependency1__["default"];

    var GhostPopover = Ember.Component.extend(PopoverMixin, {
        classNames: 'ghost-popover fade-in',
        classNameBindings: ['isOpen:open'],
        name: null,

        //Don't manipulate isOpen directly! Use open() and close()
        isOpen: false,
        open: function () {
            this.set('closing', false);
            this.set('isOpen', true);
        },

        //Helps us track if the menu was opened again right after
        //  it was closed.
        closing: false,
        close: function () {
            var self = this;
            this.set('closing', true);
            this.$().fadeOut(200, function () {
                //Make sure this wasn't an aborted fadeout by
                //checking `closing`.
                if (self.get('closing')) {
                    self.set('isOpen', false);
                    self.set('closing', false);
                }
            });
        },
        //Called by the popover service when any popover button is clicked.
        toggle: function (options) {
            var isClosing = this.get('closing'),
                isOpen = this.get('isOpen'),
                name = this.get('name'),
                targetPopoverName = options.target;
            
            if (name === targetPopoverName && (!isOpen || isClosing)) {
                this.open();
            } else if (isOpen) {
                this.close();
            }
        },

        closeOnClick: false,
        click: function (event) {
            this._super(event);
            if (this.get('closeOnClick')) {
                return this.close();
            }
        },

        didInsertElement: function () {
            this._super();
            var popoverService = this.get('popover');

            popoverService.on('close', this, this.close);
            popoverService.on('toggle', this, this.toggle);
        },
        willDestroyElement: function () {
            this._super();
            var popoverService = this.get('popover');

            popoverService.off('close', this, this.close);
            popoverService.off('toggle', this, this.toggle);
        }
    });

    __exports__["default"] = GhostPopover;
  });
define("ghost/components/gh-trim-focus-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var TrimFocusInput = Ember.TextField.extend({
        setFocus: function () {
            this.$().val(this.$().val()).focus();
        }.on('didInsertElement'),

        focusOut: function () {
            var text = this.$().val();

            this.$().val(text.trim());
        }
    });

    __exports__["default"] = TrimFocusInput;
  });
define("ghost/components/gh-upload-modal", 
  ["ghost/components/gh-modal-dialog","ghost/assets/lib/uploader","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ModalDialog = __dependency1__["default"];
    var upload = __dependency2__["default"];

    var UploadModal = ModalDialog.extend({
        layoutName: 'components/gh-modal-dialog',

        didInsertElement: function () {
            this._super();
            upload.call(this.$('.js-drop-zone'), {fileStorage: this.get('config.fileStorage')});
        },
        confirm: {
            reject: {
                func: function () { // The function called on rejection
                    return true;
                },
                buttonClass: true,
                text: 'Cancel' // The reject button text
            },
            accept: {
                buttonClass: 'button-save right',
                text: 'Save', // The accept button texttext: 'Save'
                func: function () {
                    var imageType = 'model.' + this.get('imageType');

                    if (this.$('.js-upload-url').val()) {
                        this.set(imageType, this.$('.js-upload-url').val());
                    } else {
                        this.set(imageType, this.$('.js-upload-target').attr('src'));
                    }
                    return true;
                }
            }
        },

        actions: {
            closeModal: function () {
                this.sendAction();
            },
            confirm: function (type) {
                var func = this.get('confirm.' + type + '.func');
                if (typeof func === 'function') {
                    func.apply(this);
                }
                this.sendAction();
                this.sendAction('confirm' + type);
            }
        }
    });

    __exports__["default"] = UploadModal;
  });
define("ghost/controllers/application", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ApplicationController = Ember.Controller.extend({
        hideNav: Ember.computed.match('currentPath', /(signin|signup|setup|forgotten|reset)/),

        topNotificationCount: 0,

        actions: {
            toggleMenu: function () {
                this.toggleProperty('showMenu');
            },

            topNotificationChange: function (count) {
                this.set('topNotificationCount', count);
            }
        }
    });

    __exports__["default"] = ApplicationController;
  });
define("ghost/controllers/debug", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DebugController = Ember.Controller.extend(Ember.Evented, {
        uploadButtonText: 'Import',

        exportPath: function () {
            return this.get('ghostPaths.url').api('db') +
                '?access_token=' + this.get('session.access_token');
        }.property(),

        actions: {
            onUpload: function (file) {
                var self = this,
                    formData = new FormData();

                this.set('uploadButtonText', 'Importing');

                formData.append('importfile', file);

                ic.ajax.request(this.get('ghostPaths.url').api('db'), {
                    type: 'POST',
                    data: formData,
                    dataType: 'json',
                    cache: false,
                    contentType: false,
                    processData: false
                }).then(function () {
                    self.notifications.showSuccess('Import successful.');
                }).catch(function (response) {
                    self.notifications.showAPIError(response);
                }).finally(function () {
                    self.set('uploadButtonText', 'Import');
                    self.trigger('reset');
                });
            },

            exportData: function () {
                var self = this;

                ic.ajax.request(this.get('ghostPaths.url').api('db'), {
                    type: 'GET'
                }).then(function () {
                    self.notifications.showSuccess('Data exported successfully.');
                }).catch(function (response) {
                    self.notifications.showErrors(response);
                });
            },

            sendTestEmail: function () {
                var self = this;

                ic.ajax.request(this.get('ghostPaths.url').api('mail', 'test'), {
                    type: 'POST'
                }).then(function () {
                    self.notifications.showSuccess('Check your email for the test message:');
                }).catch(function (response) {
                    self.notifications.showErrors(response);
                });
            }
        }
    });

    __exports__["default"] = DebugController;
  });
define("ghost/controllers/editor/edit", 
  ["ghost/mixins/editor-base-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorControllerMixin = __dependency1__["default"];

    var EditorEditController = Ember.ObjectController.extend(EditorControllerMixin);

    __exports__["default"] = EditorEditController;
  });
define("ghost/controllers/editor/new", 
  ["ghost/mixins/editor-base-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorControllerMixin = __dependency1__["default"];

    var EditorNewController = Ember.ObjectController.extend(EditorControllerMixin, {
        actions: {
            /**
              * Redirect to editor after the first save
              */
            save: function () {
                var self = this;
                this._super().then(function (model) {
                    if (model.get('id')) {
                        self.transitionToRoute('editor.edit', model);
                    }
                });
            }
        }
    });

    __exports__["default"] = EditorNewController;
  });
define("ghost/controllers/error", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ErrorController = Ember.Controller.extend({
        code: function () {
            return this.get('content.status') > 200 ? this.get('content.status') : 500;
        }.property('content.status'),
        message: function () {
            if (this.get('code') === 404) {
                return 'No Ghost Found';
            }

            return this.get('content.statusText') !== 'error' ? this.get('content.statusText') : 'Internal Server Error';
        }.property('content.statusText'),
        stack: false
    });

    __exports__["default"] = ErrorController;
  });
define("ghost/controllers/forgotten", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /* jshint unused: false */
    var ajax = __dependency1__["default"];

    var ValidationEngine = __dependency2__["default"];

    
    var ForgottenController = Ember.Controller.extend(ValidationEngine, {
        email: '',
        submitting: false,
    
        // ValidationEngine settings
        validationType: 'forgotten',
    
        actions: {
            submit: function () {
                var self = this,
                    data = self.getProperties('email');
    
                this.toggleProperty('submitting');
                this.validate({ format: false }).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                        type: 'POST',
                        data: {
                            passwordreset: [{
                                email: data.email
                            }]
                        }
                    }).then(function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showSuccess('Please check your email for instructions.');
                        self.transitionToRoute('signin');
                    }).catch(function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showAPIError(resp, 'There was a problem logging in, please try again.');
                    });
                }).catch(function (errors) {
                    self.toggleProperty('submitting');
                    self.notifications.showErrors(errors);
                });
            }
        }
    });
    
    __exports__["default"] = ForgottenController;
  });
define("ghost/controllers/modals/delete-all", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DeleteAllController = Ember.Controller.extend({
        actions: {
            confirmAccept: function () {
                var self = this;

                ic.ajax.request(this.get('ghostPaths.url').api('db'), {
                    type: 'DELETE'
                }).then(function () {
                    self.notifications.showSuccess('All content deleted from database.');
                }).catch(function (response) {
                    self.notifications.showErrors(response);
                });
            },

            confirmReject: function () {
                return false;
            }
        },

        confirm: {
            accept: {
                text: 'Delete',
                buttonClass: 'button-delete'
            },
            reject: {
                text: 'Cancel',
                buttonClass: 'button'
            }
        }
    });

    __exports__["default"] = DeleteAllController;
  });
define("ghost/controllers/modals/delete-post", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DeletePostController = Ember.Controller.extend({
        actions: {
            confirmAccept: function () {
                var self = this,
                    model = this.get('model');

                // definitely want to clear the data store and post of any unsaved, client-generated tags
                model.updateTags();

                model.destroyRecord().then(function () {
                    self.get('popover').closePopovers();
                    self.transitionToRoute('posts.index');
                    self.notifications.showSuccess('Your post has been deleted.', true);
                }, function () {
                    self.notifications.showError('Your post could not be deleted. Please try again.');
                });

            },

            confirmReject: function () {
                return false;
            }
        },
        confirm: {
            accept: {
                text: 'Delete',
                buttonClass: 'button-delete'
            },
            reject: {
                text: 'Cancel',
                buttonClass: 'button'
            }
        }
    });

    __exports__["default"] = DeletePostController;
  });
define("ghost/controllers/modals/invite-new-user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var InviteNewUserController = Ember.Controller.extend({

        confirm: {
            accept: {
                text: 'send invitation now'
            },
            reject: {
                buttonClass: 'hidden'
            }
        },

        // @TODO: replace with roles from server - see issue #3196
        roles: [
            {
                id: 3,
                name: 'Author'
            }
        ],

        actions: {
            confirmAccept: function () {
                var email = this.get('email'),
                    role_id = this.get('role'),
                    self = this,
                    newUser;

                this.notifications.closePassive();

                newUser = this.store.createRecord('user', {
                    email: email,
                    role: role_id,
                    status: 'invited'
                });

                newUser.save().then(function () {
                    var notificationText = 'Invitation sent! (' + email + ')';

                    self.notifications.showSuccess(notificationText, false);
                }).catch(function (errors) {
                    newUser.deleteRecord();
                    self.notifications.closePassive();
                    self.notifications.showErrors(errors);
                });

                this.set('email', null);
                this.set('role', null);

            },

            confirmReject: function () {
                return false;
            }
        }
    });

    __exports__["default"] = InviteNewUserController;
  });
define("ghost/controllers/modals/leave-editor", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var LeaveEditorController = Ember.Controller.extend({
        args: Ember.computed.alias('model'),

        actions: {
            confirmAccept: function () {
                var args = this.get('args'),
                    editorController,
                    model,
                    transition;

                if (Ember.isArray(args)) {
                    editorController = args[0];
                    transition = args[1];
                    model = editorController.get('model');
                }

                if (!transition || !editorController) {
                    this.notifications.showError('Sorry, there was an error in the application. Please let the Ghost team know what happened.');
                    return true;
                }

                // definitely want to clear the data store and post of any unsaved, client-generated tags
                model.updateTags();

                if (model.get('isNew')) {
                    // the user doesn't want to save the new, unsaved post, so delete it.
                    model.deleteRecord();
                } else {
                    // roll back changes on model props
                    model.rollback();
                }

                // setting isDirty to false here allows willTransition on the editor route to succeed
                editorController.set('isDirty', false);

                // since the transition is now certain to complete, we can unset window.onbeforeunload here
                window.onbeforeunload = null;

                transition.retry();
            },

            confirmReject: function () {

            }
        },

        confirm: {
            accept: {
                text: 'Leave',
                buttonClass: 'button-delete'
            },
            reject: {
                text: 'Stay',
                buttonClass: 'button'
            }
        }
    });

    __exports__["default"] = LeaveEditorController;
  });
define("ghost/controllers/modals/upload", 
  ["exports"],
  function(__exports__) {
    "use strict";

    var UploadController = Ember.Controller.extend({
        acceptEncoding: 'image/*',
        actions: {
            confirmAccept: function () {
                var self = this;

                this.get('model').save().then(function (model) {
                    self.notifications.showSuccess('Saved');
                    return model;
                }).catch(this.notifications.showErrors);
            },

            confirmReject: function () {
                return false;
            }
        }
    });

    __exports__["default"] = UploadController;
  });
define("ghost/controllers/post-settings-menu", 
  ["ghost/utils/date-formatting","ghost/models/slug-generator","ghost/utils/bound-one-way","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    /* global moment */
    var parseDateString = __dependency1__.parseDateString;
    var formatDate = __dependency1__.formatDate;
    var SlugGenerator = __dependency2__["default"];
    var boundOneWay = __dependency3__["default"];

    var PostSettingsMenuController = Ember.ObjectController.extend({
        init: function () {
            this._super();

            // when creating a new post we want to observe the title
            // to generate the post's slug
            if (this.get('isNew')) {
                this.addObserver('titleScratch', this, 'titleObserver');
            }
        },
        selectedAuthor: Ember.computed.oneWay('author'),
        changeAuthor: function () {
            var author = this.get('author'),
                selectedAuthor = this.get('selectedAuthor'),
                model = this.get('model'),
                self = this;
            //return if nothing changed
            if (selectedAuthor.get('id') === author.get('id')) {
                return;
            }
            model.set('author', selectedAuthor);
            model.save(this.get('saveOptions')).catch(function (errors) {
                self.showErrors(errors);
                self.set('selectedAuthor', author);
                model.rollback();
            });
        }.observes('selectedAuthor'),
        authors: function () {
            //Loaded asynchronously, so must use promise proxies.
            var deferred = {};
            deferred.promise = this.store.find('user').then(function (users) {
                return users.rejectBy('id', 'me');
            });
            return Ember.ArrayProxy
                .extend(Ember.PromiseProxyMixin)
                .create(deferred);
        }.property(),
        //Changes in the PSM are too minor to warrant NProgress firing
        saveOptions: {disableNProgress: true},
        /**
         * The placeholder is the published date of the post,
         * or the current date if the pubdate has not been set.
         */
        publishedAtPlaceholder: function () {
            var pubDate = this.get('published_at');
            if (pubDate) {
                return formatDate(pubDate);
            }
            return formatDate(moment());
        }.property('publishedAtValue'),
        publishedAtValue: boundOneWay('published_at', formatDate),

        slugValue: boundOneWay('slug'),
        //Lazy load the slug generator for slugPlaceholder
        slugGenerator: Ember.computed(function () {
            return SlugGenerator.create({
                ghostPaths: this.get('ghostPaths')
            });
        }),
        //Requests slug from title
        generateSlugPlaceholder: function () {
            var self = this,
                title = this.get('titleScratch');

            this.get('slugGenerator').generateSlug(title).then(function (slug) {
                self.set('slugPlaceholder', slug);
            });
        },
        titleObserver: function () {
            if (this.get('isNew') && !this.get('title')) {
                Ember.run.debounce(this, 'generateSlugPlaceholder', 700);
            }
        },
        slugPlaceholder: function (key, value) {
            var slug = this.get('slug');

            //If the post has a slug, that's its placeholder.
            if (slug) {
                return slug;
            }

            //Otherwise, it's whatever value was set by the
            //  slugGenerator (below)
            if (arguments.length > 1) {
                return value;
            }
            //The title will stand in until the actual slug has been generated
            return this.get('titleScratch');
        }.property(),

        showErrors: function (errors) {
            errors = Ember.isArray(errors) ? errors : [errors];
            this.notifications.closePassive();
            this.notifications.showErrors(errors);
        },
        showSuccess: function (message) {
            this.notifications.closePassive();
            this.notifications.showSuccess(message);
        },
        actions: {
            togglePage: function () {
                var self = this;

                this.toggleProperty('page');
                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('isNew')) {
                    return;
                }

                this.get('model').save(this.get('saveOptions')).catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },
            /**
             * triggered by user manually changing slug
             */
            updateSlug: function (newSlug) {
                var slug = this.get('slug'),
                    self = this;

                newSlug = newSlug || slug;

                newSlug = newSlug.trim();

                // Ignore unchanged slugs or candidate slugs that are empty
                if (!newSlug || slug === newSlug) {
                    return;
                }

                this.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {
                    // If after getting the sanitized and unique slug back from the API
                    // we end up with a slug that matches the existing slug, abort the change
                    if (serverSlug === slug) {
                        return;
                    }

                    // Because the server transforms the candidate slug by stripping
                    // certain characters and appending a number onto the end of slugs
                    // to enforce uniqueness, there are cases where we can get back a
                    // candidate slug that is a duplicate of the original except for
                    // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

                    // get the last token out of the slug candidate and see if it's a number
                    var slugTokens = serverSlug.split('-'),
                        check = Number(slugTokens.pop());

                    // if the candidate slug is the same as the existing slug except
                    // for the incrementor then the existing slug should be used
                    if (_.isNumber(check) && check > 0) {
                        if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                            return;
                        }
                    }

                    self.set('slug', serverSlug);

                    if (self.hasObserverFor('titleScratch')) {
                        self.removeObserver('titleScratch', self, 'titleObserver');
                    }

                    // If this is a new post.  Don't save the model.  Defer the save
                    // to the user pressing the save button
                    if (self.get('isNew')) {
                        return;
                    }

                    return self.get('model').save(self.get('saveOptions'));
                }).then(function () {
                    self.showSuccess('Permalink successfully changed to <strong>' +
                        self.get('slug') + '</strong>.');
                }).catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },

            /**
             * Parse user's set published date.
             * Action sent by post settings menu view.
             * (#1351)
             */
            setPublishedAt: function (userInput) {
                var errMessage = '',
                    newPublishedAt = parseDateString(userInput),
                    publishedAt = this.get('published_at'),
                    self = this;

                if (!userInput) {
                    //Clear out the published_at field for a draft
                    if (this.get('isDraft')) {
                        this.set('published_at', null);
                    }
                    return;
                }

                // Validate new Published date
                if (!newPublishedAt.isValid()) {
                    errMessage = 'Published Date must be a valid date with format: ' +
                        'DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
                }
                if (newPublishedAt.diff(new Date(), 'h') > 0) {
                    errMessage = 'Published Date cannot currently be in the future.';
                }

                //If errors, notify and exit.
                if (errMessage) {
                    this.showErrors(errMessage);
                    return;
                }

                // Do nothing if the user didn't actually change the date
                if (publishedAt && publishedAt.isSame(newPublishedAt)) {
                    return;
                }

                //Validation complete
                this.set('published_at', newPublishedAt);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('isNew')) {
                    return;
                }

                this.get('model').save(this.get('saveOptions')).catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            }
        }
    });

    __exports__["default"] = PostSettingsMenuController;
  });
define("ghost/controllers/post-tags-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostTagsInputController = Ember.Controller.extend({

        tags: Ember.computed.alias('parentController.tags'),

        suggestions: null,
        newTagText: null,

        actions: {
            // triggered when the view is inserted so that later store.all('tag')
            // queries hit a full store cache and we don't see empty or out-of-date
            // suggestion lists
            loadAllTags: function () {
                this.store.find('tag');
            },

            addNewTag: function () {
                var newTagText = this.get('newTagText'),
                    searchTerm,
                    existingTags,
                    newTag;

                if (Ember.isEmpty(newTagText) || this.hasTag(newTagText)) {
                    this.send('reset');
                    return;
                }

                searchTerm = newTagText.toLowerCase();

                // add existing tag if we have a match
                existingTags = this.store.all('tag').filter(function (tag) {
                    return tag.get('name').toLowerCase() === searchTerm;
                });
                if (existingTags.get('length')) {
                    this.send('addTag', existingTags.get('firstObject'));
                } else {
                    // otherwise create a new one
                    newTag = this.store.createRecord('tag');
                    newTag.set('name', newTagText);
                    this.get('tags').pushObject(newTag);
                }

                this.send('reset');
            },

            addTag: function (tag) {
                if (!Ember.isEmpty(tag) && !this.hasTag(tag.get('name'))) {
                    this.get('tags').pushObject(tag);
                }
                this.send('reset');
            },

            deleteTag: function (tag) {
                this.get('tags').removeObject(tag);
            },

            deleteLastTag: function () {
                this.send('deleteTag', this.get('tags.lastObject'));
            },

            selectSuggestion: function (suggestion) {
                if (!Ember.isEmpty(suggestion)) {
                    this.get('suggestions').setEach('selected', false);
                    suggestion.set('selected', true);
                }
            },

            selectNextSuggestion: function () {
                var suggestions = this.get('suggestions'),
                    selectedSuggestion = this.get('selectedSuggestion'),
                    currentIndex,
                    newSelection;

                if (!Ember.isEmpty(suggestions)) {
                    currentIndex = suggestions.indexOf(selectedSuggestion);
                    if (currentIndex + 1 < suggestions.get('length')) {
                        newSelection = suggestions[currentIndex + 1];
                        this.send('selectSuggestion', newSelection);
                    } else {
                        suggestions.setEach('selected', false);
                    }
                }
            },

            selectPreviousSuggestion: function () {
                var suggestions = this.get('suggestions'),
                    selectedSuggestion = this.get('selectedSuggestion'),
                    currentIndex,
                    lastIndex,
                    newSelection;

                if (!Ember.isEmpty(suggestions)) {
                    currentIndex = suggestions.indexOf(selectedSuggestion);
                    if (currentIndex === -1) {
                        lastIndex = suggestions.get('length') - 1;
                        this.send('selectSuggestion', suggestions[lastIndex]);
                    } else if (currentIndex - 1 >= 0) {
                        newSelection = suggestions[currentIndex - 1];
                        this.send('selectSuggestion', newSelection);
                    } else {
                        suggestions.setEach('selected', false);
                    }
                }
            },

            addSelectedSuggestion: function () {
                var suggestion = this.get('selectedSuggestion');
                if (Ember.isEmpty(suggestion)) { return; }

                this.send('addTag', suggestion.get('tag'));
            },

            reset: function () {
                this.set('suggestions', null);
                this.set('newTagText', null);
            }
        },


        selectedSuggestion: function () {
            var suggestions = this.get('suggestions');
            if (suggestions && suggestions.get('length')) {
                return suggestions.filterBy('selected').get('firstObject');
            } else {
                return null;
            }
        }.property('suggestions.@each.selected'),


        updateSuggestionsList: function () {
            var searchTerm = this.get('newTagText'),
                matchingTags,
                // Limit the suggestions number
                maxSuggestions = 5,
                suggestions = new Ember.A();

            if (!searchTerm || Ember.isEmpty(searchTerm.trim())) {
                this.set('suggestions', null);
                return;
            }

            searchTerm = searchTerm.trim();

            matchingTags = this.findMatchingTags(searchTerm);
            matchingTags = matchingTags.slice(0, maxSuggestions);
            matchingTags.forEach(function (matchingTag) {
                var suggestion = this.makeSuggestionObject(matchingTag, searchTerm);
                suggestions.pushObject(suggestion);
            }, this);

            this.set('suggestions', suggestions);
        }.observes('newTagText'),


        findMatchingTags: function (searchTerm) {
            var matchingTags,
                self = this,
                allTags = this.store.all('tag');

            if (allTags.get('length') === 0) {
                return [];
            }

            searchTerm = searchTerm.toLowerCase();

            matchingTags = allTags.filter(function (tag) {
                var tagNameMatches,
                    hasAlreadyBeenAdded;

                tagNameMatches = tag.get('name').toLowerCase().indexOf(searchTerm) !== -1;
                hasAlreadyBeenAdded = self.hasTag(tag.get('name'));

                return tagNameMatches && !hasAlreadyBeenAdded;
            });

            return matchingTags;
        },

        hasTag: function (tagName) {
            return this.get('tags').mapBy('name').contains(tagName);
        },

        makeSuggestionObject: function (matchingTag, _searchTerm) {
            var searchTerm = Ember.Handlebars.Utils.escapeExpression(_searchTerm),
                regexEscapedSearchTerm = searchTerm.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'),
                tagName = Ember.Handlebars.Utils.escapeExpression(matchingTag.get('name')),
                regex = new RegExp('(' + regexEscapedSearchTerm + ')', 'gi'),
                highlightedName,
                suggestion = new Ember.Object();

            highlightedName = tagName.replace(regex, '<mark>$1</mark>');
            highlightedName = new Ember.Handlebars.SafeString(highlightedName);

            suggestion.set('tag', matchingTag);
            suggestion.set('highlightedName', highlightedName);

            return suggestion;
        },

    });

    __exports__["default"] = PostTagsInputController;
  });
define("ghost/controllers/posts", 
  ["ghost/utils/ajax","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var getRequestErrorMessage = __dependency1__.getRequestErrorMessage;

    var PostsController = Ember.ArrayController.extend({
        // this will cause the list to re-sort when any of these properties change on any of the models
        sortProperties: ['status', 'published_at', 'updated_at'],

        // override Ember.SortableMixin
        //
        // this function will keep the posts list sorted when loading individual/bulk
        // models from the server, even if records in between haven't been loaded.
        // this can happen when reloading the page on the Editor or PostsPost routes.
        //
        // a custom sort function is needed in order to sort the posts list the same way the server would:
        //     status: ASC
        //     published_at: DESC
        //     updated_at: DESC
        orderBy: function (item1, item2) {
            function publishedAtCompare() {
                var published1 = item1.get('published_at'),
                    published2 = item2.get('published_at');

                if (!published1 && !published2) {
                    return 0;
                }

                if (!published1 && published2) {
                    return -1;
                }

                if (!published2 && published1) {
                    return 1;
                }

                return Ember.compare(item1.get('published_at').valueOf(), item2.get('published_at').valueOf());
            }

            var updated1 = item1.get('updated_at'),
                updated2 = item2.get('updated_at'),
                statusResult,
                updatedAtResult,
                publishedAtResult;

            // when `updated_at` is undefined, the model is still
            // being written to with the results from the server
            if (item1.get('isNew') || !updated1) {
                return -1;
            }

            if (item2.get('isNew') || !updated2) {
                return 1;
            }

            statusResult = Ember.compare(item1.get('status'), item2.get('status'));
            updatedAtResult = Ember.compare(updated1.valueOf(), updated2.valueOf());
            publishedAtResult = publishedAtCompare();

            if (statusResult === 0) {
                if (publishedAtResult === 0) {
                    // This should be DESC
                    return updatedAtResult * -1;
                }
                // This should be DESC
                return publishedAtResult * -1;
            }

            return statusResult;
        },

        // set from PostsRoute
        paginationSettings: null,

        // holds the next page to load during infinite scroll
        nextPage: null,

        // indicates whether we're currently loading the next page
        isLoading: null,

        init: function () {
            this._super();

            var metadata = this.store.metadataFor('post');
            this.set('nextPage', metadata.pagination.next);
        },

        /**
         * Takes an ajax response, concatenates any error messages, then generates an error notification.
         * @param {jqXHR} response The jQuery ajax reponse object.
         * @return
         */
        reportLoadError: function (response) {
            var message = 'A problem was encountered while loading more posts';

            if (response) {
                // Get message from response
                message += ': ' + getRequestErrorMessage(response, true);
            } else {
                message += '.';
            }

            this.notifications.showError(message);
        },

        actions: {
            /**
            * Loads the next paginated page of posts into the ember-data store. Will cause the posts list UI to update.
            * @return
            */
            loadNextPage: function () {
                var self = this,
                    store = this.get('store'),
                    nextPage = this.get('nextPage'),
                    paginationSettings = this.get('paginationSettings');

                if (nextPage) {
                    this.set('isLoading', true);
                    this.set('paginationSettings.page', nextPage);
                    store.find('post', paginationSettings).then(function () {
                        var metadata = store.metadataFor('post');

                        self.set('nextPage', metadata.pagination.next);
                        self.set('isLoading', false);
                    }, function (response) {
                        self.reportLoadError(response);
                    });
                }
            }
        }
    });

    __exports__["default"] = PostsController;
  });
define("ghost/controllers/posts/post", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostController = Ember.ObjectController.extend({
        isPublished: Ember.computed.equal('status', 'published'),
        classNameBindings: ['featured'],

        actions: {
            toggleFeatured: function () {
                var options = {disableNProgress: true},
                    self = this;

                this.toggleProperty('featured');
                this.get('model').save(options).catch(function (errors) {
                    self.notifications.closePassive();
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = PostController;
  });
define("ghost/controllers/reset", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*global console*/
    /* jshint unused: false */
    var ajax = __dependency1__["default"];

    var ValidationEngine = __dependency2__["default"];

    
    var ResetController = Ember.Controller.extend(ValidationEngine, {
        passwords: {
            newPassword: '',
            ne2Password: ''
        },
        token: '',
        submitButtonDisabled: false,
    
        validationType: 'reset',
    
        actions: {
            submit: function () {
                var self = this,
                    data = self.getProperties('passwords', 'token');
    
                this.toggleProperty('submitting');
                this.validate({format: false}).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                        type: 'PUT',
                        data: {
                            passwordreset: [{
                                newPassword: data.passwords.newPassword,
                                ne2Password: data.passwords.ne2Password,
                                token: data.token
                            }]
                        }
                    }).then(function (resp) {
                        self.toggleProperty('submitting');
                        console.log('success');
                        self.transitionToRoute('signin');
                    }).catch(function (errors) {
                        self.toggleProperty('submitting');
                        console.log('error');
                    });
                }).catch(function (error) {
                    self.toggleProperty('submitting');
                    // @TODO: notifications here for validation errors
                    console.log('validation error', error);
                });
            }
        }
    });
    
    __exports__["default"] = ResetController;
  });
define("ghost/controllers/settings", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsController = Ember.Controller.extend({
        showApps: Ember.computed.bool('config.apps')
    });

    __exports__["default"] = SettingsController;
  });
define("ghost/controllers/settings/app", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global alert */

    var AppStates = {
        active: 'active',
        working: 'working',
        inactive: 'inactive'
    };

    var SettingsAppController = Ember.ObjectController.extend({
        appState: AppStates.active,
        buttonText: '',
        
        setAppState: function () {
            this.set('appState', this.get('active') ? AppStates.active : AppStates.inactive);
        }.on('init'),

        buttonTextSetter: function () {
            switch (this.get('appState')) {
                case AppStates.active:
                    this.set('buttonText', 'Deactivate');
                    break;
                case AppStates.inactive:
                    this.set('buttonText', 'Activate');
                    break;
                case AppStates.working:
                    this.set('buttonText', 'Working');
                    break;
            }
        }.observes('appState').on('init'),

        activeClass: function () {
            return this.appState === AppStates.active ? true : false;
        }.property('appState'),

        inactiveClass: function () {
            return this.appState === AppStates.inactive ? true : false;
        }.property('appState'),

        actions: {
            toggleApp: function (app) {
                var self = this;
                this.set('appState', AppStates.working);
                
                app.set('active', !app.get('active'));
                
                app.save().then(function () {
                    self.setAppState();
                })
                .then(function () {
                    alert('@TODO: Success');
                })
                .catch(function () {
                    alert('@TODO: Failure');
                });
            }
        }
    });

    __exports__["default"] = SettingsAppController;
  });
define("ghost/controllers/settings/general", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsGeneralController = Ember.ObjectController.extend({
        isDatedPermalinks: function (key, value) {
            // setter
            if (arguments.length > 1) {
                this.set('permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');
            }

            // getter
            var slugForm = this.get('permalinks');

            return slugForm !== '/:slug/';
        }.property('permalinks'),

        themes: function () {
            return this.get('availableThemes').reduce(function (themes, t) {
                var theme = {};

                theme.name = t.name;
                theme.label = t.package ? t.package.name + ' - ' + t.package.version : t.name;
                theme.package = t.package;
                theme.active = !!t.active;

                themes.push(theme);

                return themes;
            }, []);
        }.property().readOnly(),

        actions: {
            save: function () {
                var self = this;

                return this.get('model').save().then(function (model) {
                    self.notifications.closePassive();
                    self.notifications.showSuccess('Settings successfully saved.');

                    return model;
                }).catch(function (errors) {
                    self.notifications.closePassive();
                    self.notifications.showErrors(errors);
                });
            },
        }
    });

    __exports__["default"] = SettingsGeneralController;
  });
define("ghost/controllers/settings/users/index", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var UsersIndexController = Ember.ArrayController.extend({
        users: Ember.computed.alias('model'),

        activeUsers: Ember.computed.filterBy('users', 'status', 'active'),

        invitedUsers: Ember.computed.filterBy('users', 'status', 'invited')
    });

    __exports__["default"] = UsersIndexController;
  });
define("ghost/controllers/settings/users/user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsUserController = Ember.ObjectController.extend({

        user: Ember.computed.alias('model'),

        email: Ember.computed.readOnly('user.email'),

        coverDefault: function () {
            return this.get('ghostPaths.url').asset('/shared/img/user-cover.png');
        }.property('ghostPaths'),

        userDefault: function () {
            return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
        }.property('ghostPaths'),

        cover: function () {
            var cover = this.get('user.cover');
            if (typeof cover !== 'string') {
                cover = this.get('coverDefault');
            }
            return cover;
        }.property('user.cover', 'coverDefault'),

        coverTitle: function () {
            return this.get('user.name') + '\'s Cover Image';
        }.property('user.name'),

        image: function () {
            return  'background-image: url(' + this.get('imageUrl') + ')';
        }.property('imageUrl'),

        imageUrl: function () {
            return this.get('user.image') || this.get('userDefault');
        }.property('user.image'),

        last_login: function () {
            var lastLogin = this.get('user.last_login');

            return lastLogin ? lastLogin.fromNow() : '';

        }.property('user.last_login'),

        created_at: function () {
            var createdAt = this.get('user.created_at');

            return createdAt ? createdAt.fromNow() : '';
        }.property('user.created_at'),

        actions: {
            revoke: function () {
                var self = this,
                    email = this.get('email');

                this.get('model').destroyRecord().then(function () {
                    var notificationText = 'Invitation revoked. (' + email + ')';
                    self.notifications.showSuccess(notificationText, false);
                }).catch(function (error) {
                    self.notifications.closePassive();
                    self.notifications.showAPIError(error);
                });
            },

            resend: function () {
                var self = this;

                this.get('model').resendInvite().then(function () {
                    var notificationText = 'Invitation resent! (' + self.get('email') + ')';
                    self.notifications.showSuccess(notificationText, false);
                }).catch(function (error) {
                    self.notifications.closePassive();
                    self.notifications.showAPIError(error);
                });
            },

            save: function () {
                var user = this.get('user'),
                    self = this;

                user.save({ format: false }).then(function (model) {
                    self.notifications.closePassive();
                    self.notifications.showSuccess('Settings successfully saved.');

                    return model;
                }).catch(function (errors) {
                    self.notifications.closePassive();
                    self.notifications.showErrors(errors);
                });
            },

            password: function () {
                var user = this.get('user'),
                    self = this;

                if (user.get('isPasswordValid')) {
                    user.saveNewPassword().then(function (model) {

                        // Clear properties from view
                        user.setProperties({
                            'password': '',
                            'newPassword': '',
                            'ne2Password': ''
                        });

                        self.notifications.closePassive();
                        self.notifications.showSuccess('Password updated.');

                        return model;
                    }).catch(function (errors) {
                        self.notifications.closePassive();
                        self.notifications.showAPIError(errors);
                    });
                } else {
                    self.notifications.showErrors(user.get('passwordValidationErrors'));
                }
            }
        }
    });

    __exports__["default"] = SettingsUserController;
  });
define("ghost/controllers/setup", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ajax = __dependency1__["default"];
    var ValidationEngine = __dependency2__["default"];

    var SetupController = Ember.ObjectController.extend(ValidationEngine, {
        blogTitle: null,
        name: null,
        email: null,
        password: null,
        submitting: false,

        // ValidationEngine settings
        validationType: 'setup',

        actions: {
            setup: function () {
                var self = this,
                    data = self.getProperties('blogTitle', 'name', 'email', 'password');

                self.notifications.closePassive();

                this.toggleProperty('submitting');
                this.validate({ format: false }).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'setup'),
                        type: 'POST',
                        data: {
                            setup: [{
                                name: data.name,
                                email: data.email,
                                password: data.password,
                                blogTitle: data.blogTitle
                            }]
                        }
                    }).then(function () {
                        self.get('session').authenticate('ember-simple-auth-authenticator:oauth2-password-grant', {
                            identification: self.get('email'),
                            password: self.get('password')
                        }).then(function () {
                            self.send('signedIn');
                            self.transitionToRoute(Ember.SimpleAuth.routeAfterAuthentication);
                        });
                    }, function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showAPIError(resp);
                    });
                }, function (errors) {
                    self.toggleProperty('submitting');
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = SetupController;
  });
define("ghost/controllers/signin", 
  ["ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];

    var SigninController = Ember.Controller.extend(Ember.SimpleAuth.LoginControllerMixin, ValidationEngine, {
        authenticatorFactory: 'ember-simple-auth-authenticator:oauth2-password-grant',

        validationType: 'signin',

        actions: {
            validateAndAuthenticate: function () {
                var self = this;

                this.validate({ format: false }).then(function () {
                    self.send('authenticate');
                }).catch(function (errors) {
                    self.notifications.closePassive();
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = SigninController;
  });
define("ghost/controllers/signup", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ajax = __dependency1__["default"];
    var ValidationEngine = __dependency2__["default"];

    var SignupController = Ember.ObjectController.extend(ValidationEngine, {
        name: null,
        email: null,
        password: null,
        token: null,
        submitting: false,

        // ValidationEngine settings
        validationType: 'signup',

        actions: {
            signup: function () {
                var self = this,
                    data = self.getProperties('name', 'email', 'password', 'token');

                self.notifications.closePassive();

                this.toggleProperty('submitting');
                this.validate({ format: false }).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                        type: 'POST',
                        dataType: 'json',
                        data: {
                            invitation: [{
                                name: data.name,
                                email: data.email,
                                password: data.password,
                                token: data.token
                            }]
                        }
                    }).then(function () {
                        self.get('session').authenticate('ember-simple-auth-authenticator:oauth2-password-grant', {
                            identification: self.get('email'),
                            password: self.get('password')
                        }).then(function () {
                            self.send('signedIn');
                            self.transitionToRoute(Ember.SimpleAuth.routeAfterAuthentication);
                        });
                    }, function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showAPIError(resp);
                    });
                }, function (errors) {
                    self.toggleProperty('submitting');
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = SignupController;
  });
define("ghost/fixtures/apps", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var apps = [
        {
            'id': 1,
            'name': 'testApp',
            'package': {
                'name': 'testApp',
                'version': '2.0.1',
                'description': 'An example application showing how to filter jquery from ghost foot',
                'author': 'Ghost Foundation',
                'homepage': 'http://ghost.org',
                'repository': {
                    'type': 'git',
                    'url': 'git://github.com/TryGhost/Example-Apps'
                },
                'licenses': [
                    {
                        'type': 'MIT',
                        'url': 'https://raw.github.com/TryGhost/Example-Apps/master/LICENSE'
                    }
                ],
                'main': 'index.js',
                'engines': {
                    'node': '0.10.*'
                },
                'engineStrict': true,
                'dependencies': {
                    'ghost-app': '~0.0.2',
                    'lodash': '~2.4.1'
                },
                'devDependencies': {}
            },
            'active': true
        },
        {
            'id': 2,
            'name': 'testApp2',
            'package': {
                'name': 'testApp2',
                'version': '0.1.1',
                'description': 'An example application showing how to filter jquery from ghost foot',
                'author': 'Ghost Foundation',
                'homepage': 'http://ghost.org',
                'repository': {
                    'type': 'git',
                    'url': 'git://github.com/TryGhost/Example-Apps'
                },
                'licenses': [
                    {
                        'type': 'MIT',
                        'url': 'https://raw.github.com/TryGhost/Example-Apps/master/LICENSE'
                    }
                ],
                'main': 'index.js',
                'engines': {
                    'node': '0.10.*'
                },
                'engineStrict': true,
                'dependencies': {
                    'ghost-app': '~0.0.2',
                    'lodash': '~2.4.1'
                },
                'devDependencies': {}
            },
            'active': false
        },
    ];

    __exports__["default"] = apps;
  });
define("ghost/fixtures/init", 
  ["ghost/fixtures/posts","ghost/fixtures/users","ghost/fixtures/settings","ghost/fixtures/apps","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var postFixtures = __dependency1__["default"];
    var userFixtures = __dependency2__["default"];
    var settingsFixtures = __dependency3__["default"];
    var appFixtures = __dependency4__["default"];

    var response = function (responseBody, status) {
        status = status || 200;
        var textStatus = (status === 200) ? 'success' : 'error';

        return {
            response: responseBody,
            jqXHR: { status: status },
            textStatus: textStatus
        };
    };

    var user = function (status) {
        return response(userFixtures.findBy('id', 1), status);
    };

    var post = function (id, status) {
        return response(postFixtures.findBy('id', id), status);
    };

    var posts = function (status) {
        return response({
            'posts': postFixtures,
            'page': 1,
            'limit': 15,
            'pages': 1,
            'total': 2
        }, status);
    };

    var settings = function (status) {
        return response(settingsFixtures, status);
    };

    var apps = function (status) {
        return response(appFixtures, status);
    };

    var defineFixtures = function (status) {
        ic.ajax.defineFixture('/ghost/api/v0.1/posts', posts(status));
        ic.ajax.defineFixture('/ghost/api/v0.1/posts/1', post(1, status));
        ic.ajax.defineFixture('/ghost/api/v0.1/posts/2', post(2, status));
        ic.ajax.defineFixture('/ghost/api/v0.1/posts/3', post(3, status));
        ic.ajax.defineFixture('/ghost/api/v0.1/posts/4', post(4, status));
        ic.ajax.defineFixture('/ghost/api/v0.1/slugs/post/test%20title/', response('generated-slug', status));

        ic.ajax.defineFixture('/ghost/api/v0.1/users/me/', user(status));
        ic.ajax.defineFixture('/ghost/changepw/', response({
            msg: 'Password changed successfully'
        }));
        ic.ajax.defineFixture('/ghost/api/v0.1/forgotten/', response({
            redirect: '/ghost/signin/'
        }));
        ic.ajax.defineFixture('/ghost/api/v0.1/reset/', response({
            msg: 'Password changed successfully'
        }));
        ic.ajax.defineFixture('/ghost/api/v0.1/settings/?type=blog,theme,app', settings(status));
        ic.ajax.defineFixture('/ghost/api/v0.1/apps', apps(status));
        ic.ajax.defineFixture('/ghost/api/v0.1/apps/1', response({
            response: 'success'
        }));
    };

    __exports__["default"] = defineFixtures;
  });
define("ghost/fixtures/posts", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* jshint ignore:start */
    var posts =  [
            {
                "id": 1,
                "uuid": "791bc05a-a328-4e68-b3b2-f732dda70146",
                "status": "published",
                "title": "tempor commodo exercitation pariatur reprehenderit reprehenderit irure labore consectetur eiusmod",
                "slug": "tempor-commodo-exercitation-pariatur-reprehenderit-reprehenderit-irure-labore-consectetur-eiusmod",
                "markdown": "Consequat aliquip duis excepteur ut cupidatat esse sit. Culpa enim reprehenderit duis commodo eiusmod consectetur ad id reprehenderit pariatur. Proident ex tempor minim elit. Commodo irure et dolore dolore est proident in nisi exercitation aliquip eiusmod deserunt laborum et. Esse esse enim sint commodo culpa ut nisi. Irure reprehenderit cillum id ad.\r\nDolore eu occaecat ullamco excepteur veniam officia. Incididunt veniam proident tempor eiusmod ex esse. Veniam tempor eu ea reprehenderit elit ullamco minim non laborum elit tempor.\r\nLabore dolore incididunt non duis ex velit eiusmod deserunt duis mollit. Velit culpa ut enim reprehenderit dolore duis ex incididunt. Excepteur commodo nisi occaecat commodo. Ut sint ex fugiat reprehenderit ex id ullamco duis ullamco sint proident laboris ut voluptate. Nostrud duis ea adipisicing deserunt ea ad sunt et laborum elit incididunt aute occaecat. Minim ad in voluptate sint sunt excepteur nisi ex. Tempor in nisi veniam voluptate fugiat dolor deserunt quis sunt labore veniam occaecat.\r\nDuis ut culpa nostrud sunt deserunt quis elit Lorem est amet ut eu eiusmod. Ullamco dolor ex deserunt velit sit veniam nostrud laboris qui duis. Non do commodo aliqua proident aute elit nostrud excepteur in. Laboris occaecat voluptate culpa nisi elit exercitation aliqua consequat. Sit eiusmod nisi eiusmod culpa dolor.\r\nAliqua exercitation qui reprehenderit Lorem minim laboris ullamco dolor voluptate. Tempor nisi aute qui nisi est elit irure. Duis pariatur laboris est officia aliqua enim non reprehenderit officia nulla sint.\r\nSunt et cillum eu nisi nisi. Aute duis aute consequat cillum cupidatat duis excepteur cupidatat. Incididunt labore dolore quis pariatur tempor ipsum magna tempor veniam laboris sit do. Nulla quis fugiat dolore et ut ea Lorem excepteur exercitation tempor dolore dolor. Minim Lorem dolor commodo laborum nisi dolore Lorem occaecat ut irure aute fugiat cillum. Esse eiusmod sit veniam fugiat laborum exercitation tempor incididunt. Amet fugiat eu commodo proident officia.\r\nAd incididunt aliqua commodo eiusmod est qui deserunt Lorem cupidatat exercitation commodo velit commodo. Nostrud incididunt aliquip dolore consequat in ut excepteur cupidatat sunt. Aliqua sunt fugiat nostrud do minim incididunt do qui qui ipsum est. Elit commodo reprehenderit exercitation do irure non exercitation fugiat culpa quis do. Minim mollit magna amet mollit.\r\nQui exercitation eiusmod exercitation esse do magna irure mollit ullamco aute anim. Minim aliqua irure commodo sunt excepteur ullamco occaecat officia esse laboris. Nostrud ea exercitation reprehenderit proident est. Ut labore ea aliquip laboris voluptate labore qui exercitation cupidatat incididunt. Sint nisi deserunt occaecat consequat eu culpa consequat cillum.\r\n",
                "html": "<p>Consequat aliquip duis excepteur ut cupidatat esse sit. Culpa enim reprehenderit duis commodo eiusmod consectetur ad id reprehenderit pariatur. Proident ex tempor minim elit. Commodo irure et dolore dolore est proident in nisi exercitation aliquip eiusmod deserunt laborum et. Esse esse enim sint commodo culpa ut nisi. Irure reprehenderit cillum id ad.\r\nDolore eu occaecat ullamco excepteur veniam officia. Incididunt veniam proident tempor eiusmod ex esse. Veniam tempor eu ea reprehenderit elit ullamco minim non laborum elit tempor.\r\nLabore dolore incididunt non duis ex velit eiusmod deserunt duis mollit. Velit culpa ut enim reprehenderit dolore duis ex incididunt. Excepteur commodo nisi occaecat commodo. Ut sint ex fugiat reprehenderit ex id ullamco duis ullamco sint proident laboris ut voluptate. Nostrud duis ea adipisicing deserunt ea ad sunt et laborum elit incididunt aute occaecat. Minim ad in voluptate sint sunt excepteur nisi ex. Tempor in nisi veniam voluptate fugiat dolor deserunt quis sunt labore veniam occaecat.\r\nDuis ut culpa nostrud sunt deserunt quis elit Lorem est amet ut eu eiusmod. Ullamco dolor ex deserunt velit sit veniam nostrud laboris qui duis. Non do commodo aliqua proident aute elit nostrud excepteur in. Laboris occaecat voluptate culpa nisi elit exercitation aliqua consequat. Sit eiusmod nisi eiusmod culpa dolor.\r\nAliqua exercitation qui reprehenderit Lorem minim laboris ullamco dolor voluptate. Tempor nisi aute qui nisi est elit irure. Duis pariatur laboris est officia aliqua enim non reprehenderit officia nulla sint.\r\nSunt et cillum eu nisi nisi. Aute duis aute consequat cillum cupidatat duis excepteur cupidatat. Incididunt labore dolore quis pariatur tempor ipsum magna tempor veniam laboris sit do. Nulla quis fugiat dolore et ut ea Lorem excepteur exercitation tempor dolore dolor. Minim Lorem dolor commodo laborum nisi dolore Lorem occaecat ut irure aute fugiat cillum. Esse eiusmod sit veniam fugiat laborum exercitation tempor incididunt. Amet fugiat eu commodo proident officia.\r\nAd incididunt aliqua commodo eiusmod est qui deserunt Lorem cupidatat exercitation commodo velit commodo. Nostrud incididunt aliquip dolore consequat in ut excepteur cupidatat sunt. Aliqua sunt fugiat nostrud do minim incididunt do qui qui ipsum est. Elit commodo reprehenderit exercitation do irure non exercitation fugiat culpa quis do. Minim mollit magna amet mollit.\r\nQui exercitation eiusmod exercitation esse do magna irure mollit ullamco aute anim. Minim aliqua irure commodo sunt excepteur ullamco occaecat officia esse laboris. Nostrud ea exercitation reprehenderit proident est. Ut labore ea aliquip laboris voluptate labore qui exercitation cupidatat incididunt. Sint nisi deserunt occaecat consequat eu culpa consequat cillum.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 5,
                    "uuid": "5cdc87d1-6037-4bda-b277-8c7340a75857",
                    "name": "Knight Crane",
                    "slug": "knight-crane",
                    "email": "knightcrane@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "labore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-19T09:47:45.242 +07:00",
                    "updated_at": "2013-10-15T14:04:19.352 +07:00"
                },
                "created_at": "2013-01-22T12:18:09.974 +08:00",
                "created_by": {
                    "id": 1,
                    "uuid": "450a23e3-671e-4244-9f31-a34467d5ff60",
                    "name": "Mari Roach",
                    "slug": "mari-roach",
                    "email": "mariroach@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "fugiat commodo voluptate",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-10-28T14:53:15.251 +07:00",
                    "updated_at": "2012-02-03T21:55:12.160 +08:00"
                },
                "updated_at": "2013-09-07T14:32:46.658 +07:00",
                "updated_by": {
                    "id": 6,
                    "uuid": "73ae4d09-6154-42a1-9338-e858a17e6383",
                    "name": "Angeline Valencia",
                    "slug": "angeline-valencia",
                    "email": "angelinevalencia@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "eiusmod ut fugiat",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-05-19T17:54:17.134 +07:00",
                    "updated_at": "2014-03-16T21:06:15.449 +07:00"
                },
                "published_at": "2012-01-06T12:39:46.047 +08:00",
                "published_by": {
                    "id": 7,
                    "uuid": "f5c9e1ec-e019-4120-8c78-a8bb68aa4af6",
                    "name": "Dudley Travis",
                    "slug": "dudley-travis",
                    "email": "dudleytravis@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "quis sunt",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-02-23T01:51:14.535 +08:00",
                    "updated_at": "2012-10-16T18:14:32.913 +07:00"
                },
                "tags": [
                    {
                        "id": 14,
                        "uuid": "5d07f030-d195-470e-b1e9-31b517056de4",
                        "name": "ut velit dolor",
                        "slug": "ut-velit-dolor",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-03T17:58:11.590 +08:00",
                        "created_by": 2,
                        "updated_at": "2012-09-29T16:18:14.799 +07:00",
                        "updated_by": 2
                    },
                    {
                        "id": 61,
                        "uuid": "9d0bce49-1d4b-4d96-8d26-e6086ca9dc2a",
                        "name": "reprehenderit aute",
                        "slug": "reprehenderit-aute",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-10-18T01:47:13.985 +07:00",
                        "created_by": 2,
                        "updated_at": "2012-08-07T07:48:13.725 +07:00",
                        "updated_by": 2
                    },
                    {
                        "id": 7,
                        "uuid": "22e4806d-ef1a-4d0a-90e3-c04d0e032b7b",
                        "name": "officia cupidatat et",
                        "slug": "officia-cupidatat-et",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-08T03:08:12.656 +08:00",
                        "created_by": 4,
                        "updated_at": "2014-02-19T10:47:22.956 +08:00",
                        "updated_by": 3
                    }
                ]
            },
            {
                "id": 2,
                "uuid": "918dbdd6-a4fa-4520-980a-71b2598118c8",
                "status": "draft",
                "title": "id eiusmod Lorem laborum dolor culpa ut aute non fugiat",
                "slug": "id-eiusmod-Lorem-laborum-dolor-culpa-ut-aute-non-fugiat",
                "markdown": "In id incididunt quis qui labore incididunt sunt culpa pariatur aliquip incididunt velit. Id laborum anim enim proident in enim esse nostrud deserunt incididunt adipisicing anim elit. Voluptate minim dolore enim mollit deserunt dolore proident ad ex.\r\nLorem adipisicing mollit dolor nulla nulla enim qui enim aute anim consectetur et et. Pariatur enim ipsum enim deserunt quis sit voluptate laboris enim do aute ex. Cupidatat nulla ut anim nulla ex. Sunt et aliqua ut excepteur ipsum Lorem.\r\n",
                "html": "<p>In id incididunt quis qui labore incididunt sunt culpa pariatur aliquip incididunt velit. Id laborum anim enim proident in enim esse nostrud deserunt incididunt adipisicing anim elit. Voluptate minim dolore enim mollit deserunt dolore proident ad ex.\r\nLorem adipisicing mollit dolor nulla nulla enim qui enim aute anim consectetur et et. Pariatur enim ipsum enim deserunt quis sit voluptate laboris enim do aute ex. Cupidatat nulla ut anim nulla ex. Sunt et aliqua ut excepteur ipsum Lorem.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 5,
                    "uuid": "1b11d3cb-3282-4a84-916a-325a7a194ab3",
                    "name": "Madden Conrad",
                    "slug": "madden-conrad",
                    "email": "maddenconrad@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "proident labore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-08-05T08:48:27.697 +07:00",
                    "updated_at": "2013-07-14T12:19:34.694 +07:00"
                },
                "created_at": "2012-10-27T21:05:36.729 +07:00",
                "created_by": {
                    "id": 9,
                    "uuid": "0ea57ffa-1bda-4170-aa49-8e10773fbe40",
                    "name": "Latasha Thornton",
                    "slug": "latasha-thornton",
                    "email": "latashathornton@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "do esse ad",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-22T18:13:23.091 +07:00",
                    "updated_at": "2013-05-16T18:24:02.309 +07:00"
                },
                "updated_at": "2013-09-10T19:02:30.058 +07:00",
                "updated_by": {
                    "id": 4,
                    "uuid": "e778c649-51c1-40f5-afe0-a1080816f4cc",
                    "name": "Haynes Calhoun",
                    "slug": "haynes-calhoun",
                    "email": "haynescalhoun@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ea",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-06T16:51:27.286 +07:00",
                    "updated_at": "2012-08-01T12:12:58.056 +07:00"
                },
                "published_at": "2012-03-10T02:58:43.159 +08:00",
                "published_by": {
                    "id": 4,
                    "uuid": "df4d248b-8548-44d5-88c2-3c4f7e4d0b24",
                    "name": "Bullock Gomez",
                    "slug": "bullock-gomez",
                    "email": "bullockgomez@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "tempor",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-01T16:00:44.779 +07:00",
                    "updated_at": "2012-01-07T03:43:17.305 +08:00"
                },
                "tags": [
                    {
                        "id": 32,
                        "uuid": "36639ce6-a7dd-4a0c-8fee-5e31438b663d",
                        "name": "velit tempor",
                        "slug": "velit-tempor",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-02T04:58:31.783 +08:00",
                        "created_by": 0,
                        "updated_at": "2014-05-02T14:34:24.642 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 29,
                        "uuid": "15db6069-64d0-41f9-954f-dc645002fc2e",
                        "name": "qui",
                        "slug": "qui",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-09-25T12:49:11.069 +07:00",
                        "created_by": 10,
                        "updated_at": "2013-05-28T02:52:46.879 +07:00",
                        "updated_by": 1
                    },
                    {
                        "id": 23,
                        "uuid": "aca3c9d0-228f-4abb-89a3-320ba230ed0e",
                        "name": "duis",
                        "slug": "duis",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-05-07T18:45:07.898 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-08-18T23:03:06.256 +07:00",
                        "updated_by": 2
                    },
                    {
                        "id": 33,
                        "uuid": "5b50b800-190b-4391-890e-e1c4c50aa781",
                        "name": "qui",
                        "slug": "qui",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-01-18T20:36:17.750 +08:00",
                        "created_by": 2,
                        "updated_at": "2013-03-31T14:25:12.093 +07:00",
                        "updated_by": 10
                    },
                    {
                        "id": 89,
                        "uuid": "b39721e0-5a10-45fc-b1c4-f68c8a188c62",
                        "name": "incididunt sint",
                        "slug": "incididunt-sint",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-04T19:34:29.975 +08:00",
                        "created_by": 7,
                        "updated_at": "2013-01-21T16:18:55.514 +08:00",
                        "updated_by": 8
                    },
                    {
                        "id": 47,
                        "uuid": "7e82fc96-5c16-40de-8c26-2500e9145f90",
                        "name": "nulla elit aliqua",
                        "slug": "nulla-elit-aliqua",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-04-04T10:15:04.033 +07:00",
                        "created_by": 4,
                        "updated_at": "2013-12-13T20:58:39.960 +08:00",
                        "updated_by": 1
                    }
                ]
            },
            {
                "id": 3,
                "uuid": "33aa99ac-0880-4c95-b63d-7703e54d6af4",
                "status": "published",
                "title": "reprehenderit aliquip",
                "slug": "reprehenderit-aliquip",
                "markdown": "Magna ullamco proident in aliqua consequat quis deserunt aliquip nostrud. Incididunt ad ut irure mollit elit consequat anim. Ut proident aliqua quis veniam ea anim Lorem officia deserunt nisi anim.\r\nOccaecat in aute velit do mollit in nisi qui laborum pariatur et qui ea. Do esse eiusmod culpa mollit ut excepteur amet. Quis adipisicing eu elit pariatur irure minim culpa minim magna. Aliqua laborum ipsum quis laborum irure nisi aliqua laborum adipisicing laboris deserunt adipisicing exercitation. Exercitation laboris do commodo sit qui ea cillum elit ipsum cillum velit occaecat id.\r\nIpsum mollit nostrud dolor non velit irure. Proident anim nulla enim adipisicing. Anim pariatur Lorem consectetur esse labore ea. Enim laborum consectetur incididunt amet occaecat ut qui cillum et exercitation elit. Anim elit eiusmod occaecat aute Lorem Lorem in ipsum ea ipsum consectetur non sunt. Magna adipisicing exercitation ut veniam magna qui reprehenderit dolore voluptate amet enim velit sit.\r\nCommodo ad duis labore sunt ullamco amet ad labore non laborum in commodo ipsum. Minim culpa pariatur fugiat do exercitation magna reprehenderit voluptate culpa culpa nostrud. Id aliqua incididunt amet duis voluptate duis adipisicing labore in. Nostrud consequat quis pariatur reprehenderit do elit cupidatat sit ad eu ipsum aute. Non reprehenderit nostrud deserunt ex culpa cillum aliqua occaecat. Ut officia commodo officia nulla exercitation deserunt officia ipsum.\r\nEst adipisicing pariatur quis elit laborum adipisicing sunt velit tempor et est ipsum. Elit nisi officia mollit amet excepteur fugiat mollit laboris laboris ad. Ullamco labore et ad velit labore voluptate nostrud in. Nostrud Lorem enim eiusmod labore veniam officia do id laboris adipisicing. Ipsum consequat in ad ipsum qui laborum esse amet esse culpa reprehenderit. Cupidatat est aliquip in ex in et aute irure labore Lorem quis.\r\nAnim eu do do sint dolor sunt reprehenderit sit officia occaecat non qui. Commodo veniam aliqua anim pariatur adipisicing consequat non nostrud aute culpa. Cupidatat Lorem minim adipisicing ea id aute quis quis aute. Officia voluptate in nostrud velit duis laborum minim do. Sint enim laboris deserunt et.\r\nVelit dolor amet culpa proident laboris mollit laborum esse eu veniam ex nulla. Nostrud qui proident elit nisi ut aliquip incididunt. Magna pariatur id incididunt officia cillum tempor aliqua duis sint. Ullamco incididunt qui dolor excepteur aliquip labore.\r\nAdipisicing exercitation sint irure dolor. Anim sit ad ex enim irure. Culpa aliqua ullamco ut veniam enim non qui sunt ex. Magna deserunt ex proident aliquip adipisicing velit.\r\nEt eiusmod nostrud veniam magna et enim ex do veniam irure enim nulla. Veniam ut excepteur aute adipisicing. Laborum nostrud enim in in magna.\r\nConsectetur sint sit esse consectetur. Amet velit exercitation aute Lorem in Lorem est irure aute. Nisi labore est mollit tempor qui qui labore duis ea dolor. Aliquip laboris excepteur reprehenderit deserunt ad dolore. Officia ad cillum consequat consequat amet anim. Reprehenderit non officia occaecat ullamco est nisi pariatur culpa esse excepteur dolor est cillum reprehenderit.\r\n",
                "html": "<p>Magna ullamco proident in aliqua consequat quis deserunt aliquip nostrud. Incididunt ad ut irure mollit elit consequat anim. Ut proident aliqua quis veniam ea anim Lorem officia deserunt nisi anim.\r\nOccaecat in aute velit do mollit in nisi qui laborum pariatur et qui ea. Do esse eiusmod culpa mollit ut excepteur amet. Quis adipisicing eu elit pariatur irure minim culpa minim magna. Aliqua laborum ipsum quis laborum irure nisi aliqua laborum adipisicing laboris deserunt adipisicing exercitation. Exercitation laboris do commodo sit qui ea cillum elit ipsum cillum velit occaecat id.\r\nIpsum mollit nostrud dolor non velit irure. Proident anim nulla enim adipisicing. Anim pariatur Lorem consectetur esse labore ea. Enim laborum consectetur incididunt amet occaecat ut qui cillum et exercitation elit. Anim elit eiusmod occaecat aute Lorem Lorem in ipsum ea ipsum consectetur non sunt. Magna adipisicing exercitation ut veniam magna qui reprehenderit dolore voluptate amet enim velit sit.\r\nCommodo ad duis labore sunt ullamco amet ad labore non laborum in commodo ipsum. Minim culpa pariatur fugiat do exercitation magna reprehenderit voluptate culpa culpa nostrud. Id aliqua incididunt amet duis voluptate duis adipisicing labore in. Nostrud consequat quis pariatur reprehenderit do elit cupidatat sit ad eu ipsum aute. Non reprehenderit nostrud deserunt ex culpa cillum aliqua occaecat. Ut officia commodo officia nulla exercitation deserunt officia ipsum.\r\nEst adipisicing pariatur quis elit laborum adipisicing sunt velit tempor et est ipsum. Elit nisi officia mollit amet excepteur fugiat mollit laboris laboris ad. Ullamco labore et ad velit labore voluptate nostrud in. Nostrud Lorem enim eiusmod labore veniam officia do id laboris adipisicing. Ipsum consequat in ad ipsum qui laborum esse amet esse culpa reprehenderit. Cupidatat est aliquip in ex in et aute irure labore Lorem quis.\r\nAnim eu do do sint dolor sunt reprehenderit sit officia occaecat non qui. Commodo veniam aliqua anim pariatur adipisicing consequat non nostrud aute culpa. Cupidatat Lorem minim adipisicing ea id aute quis quis aute. Officia voluptate in nostrud velit duis laborum minim do. Sint enim laboris deserunt et.\r\nVelit dolor amet culpa proident laboris mollit laborum esse eu veniam ex nulla. Nostrud qui proident elit nisi ut aliquip incididunt. Magna pariatur id incididunt officia cillum tempor aliqua duis sint. Ullamco incididunt qui dolor excepteur aliquip labore.\r\nAdipisicing exercitation sint irure dolor. Anim sit ad ex enim irure. Culpa aliqua ullamco ut veniam enim non qui sunt ex. Magna deserunt ex proident aliquip adipisicing velit.\r\nEt eiusmod nostrud veniam magna et enim ex do veniam irure enim nulla. Veniam ut excepteur aute adipisicing. Laborum nostrud enim in in magna.\r\nConsectetur sint sit esse consectetur. Amet velit exercitation aute Lorem in Lorem est irure aute. Nisi labore est mollit tempor qui qui labore duis ea dolor. Aliquip laboris excepteur reprehenderit deserunt ad dolore. Officia ad cillum consequat consequat amet anim. Reprehenderit non officia occaecat ullamco est nisi pariatur culpa esse excepteur dolor est cillum reprehenderit.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 8,
                    "uuid": "a7382e31-360d-4a64-92be-73d7c625d198",
                    "name": "Danielle Fleming",
                    "slug": "danielle-fleming",
                    "email": "daniellefleming@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "proident",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-05-20T09:25:51.837 +07:00",
                    "updated_at": "2012-05-30T05:15:14.829 +07:00"
                },
                "created_at": "2012-06-30T05:46:12.248 +07:00",
                "created_by": {
                    "id": 5,
                    "uuid": "5597d0fd-15c0-46fd-ac4f-9baa854e6690",
                    "name": "Key Copeland",
                    "slug": "key-copeland",
                    "email": "keycopeland@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "proident sint adipisicing",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-05-31T07:13:55.576 +07:00",
                    "updated_at": "2013-10-19T21:52:51.845 +07:00"
                },
                "updated_at": "2013-10-06T13:44:38.828 +07:00",
                "updated_by": {
                    "id": 1,
                    "uuid": "be6f322c-324b-4b65-ab82-47620baf6cb5",
                    "name": "Sandy Harrell",
                    "slug": "sandy-harrell",
                    "email": "sandyharrell@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "culpa do sit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-09-08T09:45:16.686 +07:00",
                    "updated_at": "2012-01-08T03:27:03.858 +08:00"
                },
                "published_at": "2012-08-07T10:45:09.655 +07:00",
                "published_by": {
                    "id": 10,
                    "uuid": "c71942bd-e194-490a-afe3-43c2a2dec9df",
                    "name": "Barton Woodard",
                    "slug": "barton-woodard",
                    "email": "bartonwoodard@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "esse",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-04-26T16:53:03.552 +07:00",
                    "updated_at": "2014-01-21T18:15:38.302 +08:00"
                },
                "tags": [
                    {
                        "id": 41,
                        "uuid": "3d817a7a-1e07-4313-91f2-b86881f5a8ad",
                        "name": "occaecat ipsum cupidatat",
                        "slug": "occaecat-ipsum-cupidatat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-09-20T20:01:54.661 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-08-24T15:00:58.758 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 84,
                        "uuid": "9ef99222-8fcd-4f90-8068-fca7bf957dc6",
                        "name": "tempor dolore",
                        "slug": "tempor-dolore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-03-19T06:51:58.766 +07:00",
                        "created_by": 6,
                        "updated_at": "2014-03-12T08:59:54.988 +07:00",
                        "updated_by": 8
                    },
                    {
                        "id": 87,
                        "uuid": "19b7ab32-a8c7-41d5-9e90-67fd0daac727",
                        "name": "culpa",
                        "slug": "culpa",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-04-26T05:48:20.865 +07:00",
                        "created_by": 9,
                        "updated_at": "2012-02-12T15:18:04.811 +08:00",
                        "updated_by": 0
                    },
                    {
                        "id": 88,
                        "uuid": "332bd482-9432-4895-b2ed-2d443776157e",
                        "name": "ipsum ex",
                        "slug": "ipsum-ex",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-03-25T21:35:49.766 +07:00",
                        "created_by": 10,
                        "updated_at": "2014-01-12T16:04:10.073 +08:00",
                        "updated_by": 9
                    },
                    {
                        "id": 98,
                        "uuid": "908e8d02-73a4-4169-8517-b21e27a17bf4",
                        "name": "do voluptate",
                        "slug": "do-voluptate",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-18T09:12:13.414 +08:00",
                        "created_by": 7,
                        "updated_at": "2012-10-10T21:40:26.782 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 82,
                        "uuid": "ff2ac2a9-27b0-4531-88df-b78edf3048af",
                        "name": "ad adipisicing cillum",
                        "slug": "ad-adipisicing-cillum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-11-05T04:15:48.731 +08:00",
                        "created_by": 10,
                        "updated_at": "2013-08-24T12:39:44.809 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 14,
                        "uuid": "e3154b6e-e199-4618-a220-81942ea92135",
                        "name": "sunt ex",
                        "slug": "sunt-ex",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-06-19T06:54:09.387 +07:00",
                        "created_by": 1,
                        "updated_at": "2013-11-07T11:31:12.049 +08:00",
                        "updated_by": 7
                    },
                    {
                        "id": 33,
                        "uuid": "550c1b0e-e31c-44a9-a5ee-4973df369ce3",
                        "name": "est non ipsum",
                        "slug": "est-non-ipsum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-10-17T00:56:50.656 +07:00",
                        "created_by": 9,
                        "updated_at": "2014-04-23T03:29:37.671 +07:00",
                        "updated_by": 9
                    }
                ]
            },
            {
                "id": 4,
                "uuid": "818b07e4-ca28-4aa9-90d5-15c9738cee1d",
                "status": "published",
                "title": "quis commodo nostrud minim cupidatat",
                "slug": "quis-commodo-nostrud-minim-cupidatat",
                "markdown": "Reprehenderit et sit officia non minim tempor commodo ipsum ad veniam sunt ex reprehenderit. Lorem eu minim nostrud consectetur esse qui excepteur. Do ea consequat cupidatat exercitation sunt. Lorem eu consequat mollit qui enim reprehenderit ipsum enim cillum ea.\r\nEnim cupidatat dolor laborum do labore ut ullamco amet ut fugiat. Amet culpa adipisicing et culpa eiusmod cillum reprehenderit ex amet mollit nostrud. Irure minim occaecat elit esse enim id eu est duis.\r\nQuis labore ex veniam cillum consectetur id ea do in veniam sit officia. Est sit eiusmod aliquip aute mollit amet commodo pariatur dolor laboris nisi laboris. Ad ipsum adipisicing nostrud pariatur.\r\nQui nisi aute minim amet minim cillum cupidatat id id. Ex proident elit occaecat cupidatat proident. Proident pariatur aliqua sit voluptate sit qui et. Qui dolore est incididunt adipisicing nulla elit eu ipsum ullamco veniam do in do. Cillum eiusmod tempor occaecat pariatur minim aute. Sit eu voluptate nostrud adipisicing voluptate irure id ea. Do magna est labore voluptate id aute Lorem eiusmod dolore quis amet sunt.\r\nCillum et Lorem aute nisi. Nulla id aliqua nisi et mollit amet ullamco velit id enim. Voluptate et quis dolore non. Qui deserunt ut ut exercitation tempor dolor ullamco minim consequat ullamco exercitation quis. Excepteur consectetur fugiat adipisicing est aute. Irure consectetur aute ullamco consequat.\r\nDeserunt voluptate magna non sint dolore Lorem laborum qui dolore anim incididunt non Lorem aute. Sunt id cupidatat consequat id esse minim est consectetur eu. Aliquip sit laboris Lorem est enim consectetur eu non cupidatat quis.\r\nSit ut reprehenderit quis occaecat mollit veniam ut labore laboris laborum sunt duis tempor. Lorem cupidatat commodo esse officia officia magna laborum consequat anim voluptate. Nulla amet aute et do tempor non velit deserunt nostrud proident consectetur laborum.\r\nQui aliqua exercitation ullamco nostrud labore tempor ea cupidatat. Exercitation nisi aliqua ea anim aute esse cillum magna. Mollit ullamco culpa minim occaecat Lorem nulla irure Lorem. Est voluptate ut pariatur sit magna laborum sit id ex incididunt qui occaecat. Ex eu sint incididunt cillum magna elit eu ex adipisicing. Consectetur laboris deserunt consequat voluptate proident.\r\nOccaecat adipisicing fugiat nulla sint amet ullamco velit mollit nulla nulla ipsum nisi labore ex. Consectetur ipsum veniam exercitation adipisicing enim consequat excepteur reprehenderit. Adipisicing tempor consectetur sint aliquip amet et laboris id cillum ex commodo sit quis velit. Laborum do sint dolore culpa minim enim.\r\nSit cupidatat dolore ut commodo amet elit duis mollit dolor occaecat Lorem deserunt. Dolor minim aute labore ex nisi ad sint elit elit elit commodo. Ea aliquip veniam dolore ut nulla dolore nisi reprehenderit duis nostrud excepteur commodo dolor. Ipsum quis nostrud adipisicing aliqua ea veniam velit. Laborum officia ullamco cillum reprehenderit labore consectetur occaecat quis mollit consequat adipisicing. Id qui sunt exercitation nisi excepteur nulla ea ex eiusmod culpa officia.\r\n",
                "html": "<p>Reprehenderit et sit officia non minim tempor commodo ipsum ad veniam sunt ex reprehenderit. Lorem eu minim nostrud consectetur esse qui excepteur. Do ea consequat cupidatat exercitation sunt. Lorem eu consequat mollit qui enim reprehenderit ipsum enim cillum ea.\r\nEnim cupidatat dolor laborum do labore ut ullamco amet ut fugiat. Amet culpa adipisicing et culpa eiusmod cillum reprehenderit ex amet mollit nostrud. Irure minim occaecat elit esse enim id eu est duis.\r\nQuis labore ex veniam cillum consectetur id ea do in veniam sit officia. Est sit eiusmod aliquip aute mollit amet commodo pariatur dolor laboris nisi laboris. Ad ipsum adipisicing nostrud pariatur.\r\nQui nisi aute minim amet minim cillum cupidatat id id. Ex proident elit occaecat cupidatat proident. Proident pariatur aliqua sit voluptate sit qui et. Qui dolore est incididunt adipisicing nulla elit eu ipsum ullamco veniam do in do. Cillum eiusmod tempor occaecat pariatur minim aute. Sit eu voluptate nostrud adipisicing voluptate irure id ea. Do magna est labore voluptate id aute Lorem eiusmod dolore quis amet sunt.\r\nCillum et Lorem aute nisi. Nulla id aliqua nisi et mollit amet ullamco velit id enim. Voluptate et quis dolore non. Qui deserunt ut ut exercitation tempor dolor ullamco minim consequat ullamco exercitation quis. Excepteur consectetur fugiat adipisicing est aute. Irure consectetur aute ullamco consequat.\r\nDeserunt voluptate magna non sint dolore Lorem laborum qui dolore anim incididunt non Lorem aute. Sunt id cupidatat consequat id esse minim est consectetur eu. Aliquip sit laboris Lorem est enim consectetur eu non cupidatat quis.\r\nSit ut reprehenderit quis occaecat mollit veniam ut labore laboris laborum sunt duis tempor. Lorem cupidatat commodo esse officia officia magna laborum consequat anim voluptate. Nulla amet aute et do tempor non velit deserunt nostrud proident consectetur laborum.\r\nQui aliqua exercitation ullamco nostrud labore tempor ea cupidatat. Exercitation nisi aliqua ea anim aute esse cillum magna. Mollit ullamco culpa minim occaecat Lorem nulla irure Lorem. Est voluptate ut pariatur sit magna laborum sit id ex incididunt qui occaecat. Ex eu sint incididunt cillum magna elit eu ex adipisicing. Consectetur laboris deserunt consequat voluptate proident.\r\nOccaecat adipisicing fugiat nulla sint amet ullamco velit mollit nulla nulla ipsum nisi labore ex. Consectetur ipsum veniam exercitation adipisicing enim consequat excepteur reprehenderit. Adipisicing tempor consectetur sint aliquip amet et laboris id cillum ex commodo sit quis velit. Laborum do sint dolore culpa minim enim.\r\nSit cupidatat dolore ut commodo amet elit duis mollit dolor occaecat Lorem deserunt. Dolor minim aute labore ex nisi ad sint elit elit elit commodo. Ea aliquip veniam dolore ut nulla dolore nisi reprehenderit duis nostrud excepteur commodo dolor. Ipsum quis nostrud adipisicing aliqua ea veniam velit. Laborum officia ullamco cillum reprehenderit labore consectetur occaecat quis mollit consequat adipisicing. Id qui sunt exercitation nisi excepteur nulla ea ex eiusmod culpa officia.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 10,
                    "uuid": "e24d8cd8-3127-40e7-b726-d83e9ea09e5c",
                    "name": "Gallegos Luna",
                    "slug": "gallegos-luna",
                    "email": "gallegosluna@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolor",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-09-16T21:39:44.751 +07:00",
                    "updated_at": "2013-01-21T21:34:46.959 +08:00"
                },
                "created_at": "2012-04-30T19:28:44.191 +07:00",
                "created_by": {
                    "id": 8,
                    "uuid": "01d1a2e3-a4e4-48ea-af6a-fe0dfe20d858",
                    "name": "Mann Acosta",
                    "slug": "mann-acosta",
                    "email": "mannacosta@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "laborum",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-07-14T15:17:26.603 +07:00",
                    "updated_at": "2013-01-27T03:47:35.811 +08:00"
                },
                "updated_at": "2014-05-01T21:58:12.679 +07:00",
                "updated_by": {
                    "id": 10,
                    "uuid": "69bf5fb1-31ca-4a59-aaed-d2ecccecd306",
                    "name": "Kinney Sosa",
                    "slug": "kinney-sosa",
                    "email": "kinneysosa@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ut nostrud irure",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-11-26T00:36:16.911 +08:00",
                    "updated_at": "2013-05-26T06:50:01.691 +07:00"
                },
                "published_at": "2013-03-30T16:59:27.477 +07:00",
                "published_by": {
                    "id": 4,
                    "uuid": "ad42d003-eadd-4b88-a84d-8067ddf5f282",
                    "name": "Augusta Gibson",
                    "slug": "augusta-gibson",
                    "email": "augustagibson@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "cupidatat proident",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-03-25T13:01:48.704 +07:00",
                    "updated_at": "2013-03-31T23:28:14.257 +07:00"
                },
                "tags": [
                    {
                        "id": 5,
                        "uuid": "33691a7e-058a-408f-8de0-2ad998790dd8",
                        "name": "consectetur",
                        "slug": "consectetur",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-09-26T17:07:47.087 +07:00",
                        "created_by": 3,
                        "updated_at": "2012-09-12T14:42:58.787 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 80,
                        "uuid": "569482f3-9111-4c5d-ada2-93df72365c8b",
                        "name": "commodo",
                        "slug": "commodo",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-10T10:09:40.619 +08:00",
                        "created_by": 0,
                        "updated_at": "2012-10-01T07:37:14.873 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 52,
                        "uuid": "b71ffd4d-08c7-4977-aaf5-ebde7f00dba7",
                        "name": "culpa",
                        "slug": "culpa",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-10-22T18:34:57.206 +07:00",
                        "created_by": 9,
                        "updated_at": "2012-01-19T23:10:33.366 +08:00",
                        "updated_by": 5
                    },
                    {
                        "id": 12,
                        "uuid": "3145440b-7cf6-412e-b856-d6f88c7f6b62",
                        "name": "in quis id",
                        "slug": "in-quis-id",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-01-27T07:53:00.690 +08:00",
                        "created_by": 1,
                        "updated_at": "2012-10-27T22:42:57.495 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 14,
                        "uuid": "d398150e-5e11-43ef-89cb-d06763e1d11c",
                        "name": "ullamco occaecat",
                        "slug": "ullamco-occaecat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-27T13:11:15.905 +07:00",
                        "created_by": 9,
                        "updated_at": "2014-03-26T08:00:13.581 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 94,
                        "uuid": "3c4ec28f-0f78-492b-910b-c830807b45a4",
                        "name": "esse",
                        "slug": "esse",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-11-20T17:28:46.251 +08:00",
                        "created_by": 9,
                        "updated_at": "2013-06-16T00:02:50.140 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 78,
                        "uuid": "9c44967f-daef-4af6-99b0-980ae3b22f80",
                        "name": "ex",
                        "slug": "ex",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-01-14T09:05:34.017 +08:00",
                        "created_by": 5,
                        "updated_at": "2013-07-28T17:25:55.001 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 99,
                        "uuid": "ec1addc1-610e-4ef9-bcc5-ee6704918e2f",
                        "name": "mollit",
                        "slug": "mollit",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-12-19T20:37:43.385 +08:00",
                        "created_by": 9,
                        "updated_at": "2013-03-27T07:21:50.123 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 23,
                        "uuid": "7c95c524-4174-4d91-a5f7-7d2f4e5be80e",
                        "name": "ullamco occaecat ex",
                        "slug": "ullamco-occaecat-ex",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-06T13:35:50.224 +08:00",
                        "created_by": 8,
                        "updated_at": "2012-09-14T11:05:48.627 +07:00",
                        "updated_by": 6
                    }
                ]
            },
            {
                "id": 5,
                "uuid": "ba244082-87ee-4265-ac78-1224914b145f",
                "status": "published",
                "title": "Lorem officia",
                "slug": "Lorem-officia",
                "markdown": "Aliqua laboris dolore irure consectetur proident fugiat consequat ullamco nisi amet non ea. Excepteur est ad exercitation nulla id duis nulla exercitation consectetur aliquip nulla fugiat do do. Sit non sint non labore nisi cillum ad adipisicing elit.\r\nEst sint sit cillum proident esse nisi. Enim voluptate commodo non exercitation. Excepteur velit laborum velit exercitation deserunt magna cupidatat. Duis nisi velit in irure. Ad sint eu ipsum consectetur eu anim esse occaecat tempor elit quis dolor veniam elit.\r\nIn esse nisi ea Lorem ex. Sint cillum excepteur ad eu est qui do Lorem ullamco est commodo commodo excepteur laborum. Esse aute cupidatat velit laborum elit exercitation aliquip in sint ipsum elit velit et. Magna tempor ut voluptate non elit id tempor id ea et laborum. Id do sint et mollit qui ipsum tempor non fugiat occaecat cupidatat. Ex cupidatat culpa aute est elit exercitation eiusmod. Elit aliquip minim voluptate ullamco nisi et elit anim et Lorem aliquip veniam.\r\nCommodo eiusmod quis sunt deserunt. Ullamco eiusmod sit nulla sunt adipisicing. Ex ullamco officia et ut non cupidatat aliquip Lorem in. Nulla sit voluptate et nulla duis pariatur tempor sint sint proident elit. Excepteur fugiat id quis magna voluptate exercitation ea velit ipsum veniam duis.\r\nIncididunt ut magna nisi mollit irure sunt. Nulla mollit nulla officia fugiat quis ex veniam in dolor consectetur qui consectetur ipsum tempor. Velit et consequat sit eiusmod enim. Voluptate amet elit voluptate deserunt aliqua officia laborum ad Lorem ut magna voluptate velit. Mollit proident do anim consectetur. Tempor anim id est minim qui id anim commodo elit.\r\n",
                "html": "<p>Aliqua laboris dolore irure consectetur proident fugiat consequat ullamco nisi amet non ea. Excepteur est ad exercitation nulla id duis nulla exercitation consectetur aliquip nulla fugiat do do. Sit non sint non labore nisi cillum ad adipisicing elit.\r\nEst sint sit cillum proident esse nisi. Enim voluptate commodo non exercitation. Excepteur velit laborum velit exercitation deserunt magna cupidatat. Duis nisi velit in irure. Ad sint eu ipsum consectetur eu anim esse occaecat tempor elit quis dolor veniam elit.\r\nIn esse nisi ea Lorem ex. Sint cillum excepteur ad eu est qui do Lorem ullamco est commodo commodo excepteur laborum. Esse aute cupidatat velit laborum elit exercitation aliquip in sint ipsum elit velit et. Magna tempor ut voluptate non elit id tempor id ea et laborum. Id do sint et mollit qui ipsum tempor non fugiat occaecat cupidatat. Ex cupidatat culpa aute est elit exercitation eiusmod. Elit aliquip minim voluptate ullamco nisi et elit anim et Lorem aliquip veniam.\r\nCommodo eiusmod quis sunt deserunt. Ullamco eiusmod sit nulla sunt adipisicing. Ex ullamco officia et ut non cupidatat aliquip Lorem in. Nulla sit voluptate et nulla duis pariatur tempor sint sint proident elit. Excepteur fugiat id quis magna voluptate exercitation ea velit ipsum veniam duis.\r\nIncididunt ut magna nisi mollit irure sunt. Nulla mollit nulla officia fugiat quis ex veniam in dolor consectetur qui consectetur ipsum tempor. Velit et consequat sit eiusmod enim. Voluptate amet elit voluptate deserunt aliqua officia laborum ad Lorem ut magna voluptate velit. Mollit proident do anim consectetur. Tempor anim id est minim qui id anim commodo elit.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 5,
                    "uuid": "7a1e2657-cbf4-49a8-8719-64c2bd295f62",
                    "name": "Ruthie Cardenas",
                    "slug": "ruthie-cardenas",
                    "email": "ruthiecardenas@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ad ex adipisicing",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-09-16T23:46:32.893 +07:00",
                    "updated_at": "2012-02-16T06:10:20.540 +08:00"
                },
                "created_at": "2013-03-01T07:01:11.663 +08:00",
                "created_by": {
                    "id": 3,
                    "uuid": "30d0e73e-18c8-45bb-aced-103b89ee3909",
                    "name": "David Sutton",
                    "slug": "david-sutton",
                    "email": "davidsutton@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "laborum dolore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-03T22:50:56.364 +07:00",
                    "updated_at": "2013-03-29T08:00:16.967 +07:00"
                },
                "updated_at": "2013-07-29T11:32:43.651 +07:00",
                "updated_by": {
                    "id": 3,
                    "uuid": "a73e4401-b960-4a21-9f6a-a006fa1ccce4",
                    "name": "Wilda Morrison",
                    "slug": "wilda-morrison",
                    "email": "wildamorrison@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "proident mollit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-03-29T06:13:48.497 +07:00",
                    "updated_at": "2014-05-21T19:23:56.747 +07:00"
                },
                "published_at": "2013-07-29T21:24:28.796 +07:00",
                "published_by": {
                    "id": 1,
                    "uuid": "53ea4f0e-f968-4d0c-8a57-b451d1a4581b",
                    "name": "Mcpherson Chavez",
                    "slug": "mcpherson-chavez",
                    "email": "mcphersonchavez@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ea",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-01-02T15:28:45.526 +08:00",
                    "updated_at": "2012-11-25T11:31:23.872 +08:00"
                },
                "tags": [
                    {
                        "id": 86,
                        "uuid": "68fb7f63-ee78-4cfe-b1ac-d1cb12a6b53c",
                        "name": "mollit",
                        "slug": "mollit",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-07-06T05:56:23.028 +07:00",
                        "created_by": 0,
                        "updated_at": "2013-01-30T08:26:00.954 +08:00",
                        "updated_by": 6
                    },
                    {
                        "id": 94,
                        "uuid": "eb913e06-348a-41e0-a537-d636d4ff9b91",
                        "name": "excepteur exercitation laboris",
                        "slug": "excepteur-exercitation-laboris",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-04-30T05:23:18.522 +07:00",
                        "created_by": 0,
                        "updated_at": "2014-02-09T16:11:36.368 +08:00",
                        "updated_by": 9
                    },
                    {
                        "id": 39,
                        "uuid": "08fb2924-ae72-4f61-9bf3-da5f5941f922",
                        "name": "cupidatat et velit",
                        "slug": "cupidatat-et-velit",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-06-06T23:32:24.313 +07:00",
                        "created_by": 2,
                        "updated_at": "2012-03-18T18:10:59.333 +07:00",
                        "updated_by": 10
                    }
                ]
            },
            {
                "id": 6,
                "uuid": "a8050b7c-5bb9-4a2d-81e3-7afeb0345362",
                "status": "published",
                "title": "ea",
                "slug": "ea",
                "markdown": "Id id minim non mollit dolor quis Lorem. Nulla nostrud id officia reprehenderit consectetur sit deserunt aliquip nulla pariatur eiusmod adipisicing anim ipsum. Ipsum incididunt anim esse culpa velit nostrud qui fugiat amet ullamco. Magna ullamco reprehenderit amet pariatur velit laborum laboris esse proident culpa commodo ullamco occaecat mollit. Voluptate ad excepteur consectetur aliqua magna irure commodo duis.\r\nDo est minim sint excepteur non laborum aliquip reprehenderit Lorem magna deserunt. Voluptate veniam velit laboris ad sint exercitation. Est minim elit aute voluptate eu commodo in culpa Lorem magna dolor amet dolor. Eiusmod sunt culpa veniam voluptate minim veniam eiusmod anim magna. Commodo sunt esse sint qui occaecat excepteur Lorem labore cillum. In in nostrud qui ullamco sunt adipisicing occaecat consequat. Sunt anim non aliquip et elit amet do aliqua tempor reprehenderit in aliqua velit.\r\nCupidatat dolore nisi commodo irure nulla ad. Veniam est sunt laboris nulla commodo adipisicing nostrud in proident ex. Adipisicing elit consequat sint sit sit aliquip ullamco commodo ea consequat est quis. Ea consectetur aliqua sint est irure.\r\nAmet veniam qui ut adipisicing qui quis officia aute ullamco est. Proident ea sit magna commodo. Commodo labore est nulla irure id laborum consequat proident occaecat aute ipsum deserunt dolore.\r\nEnim aute officia minim pariatur id excepteur ad deserunt non mollit nisi dolore. Commodo cillum mollit qui excepteur exercitation quis enim Lorem occaecat excepteur sint adipisicing aliquip. In do excepteur aute ad. Irure dolore nostrud incididunt cupidatat do excepteur ipsum. Non officia labore eu nostrud mollit nisi id sunt velit et consequat duis. Sunt occaecat ipsum magna deserunt quis et ex.\r\n",
                "html": "<p>Id id minim non mollit dolor quis Lorem. Nulla nostrud id officia reprehenderit consectetur sit deserunt aliquip nulla pariatur eiusmod adipisicing anim ipsum. Ipsum incididunt anim esse culpa velit nostrud qui fugiat amet ullamco. Magna ullamco reprehenderit amet pariatur velit laborum laboris esse proident culpa commodo ullamco occaecat mollit. Voluptate ad excepteur consectetur aliqua magna irure commodo duis.\r\nDo est minim sint excepteur non laborum aliquip reprehenderit Lorem magna deserunt. Voluptate veniam velit laboris ad sint exercitation. Est minim elit aute voluptate eu commodo in culpa Lorem magna dolor amet dolor. Eiusmod sunt culpa veniam voluptate minim veniam eiusmod anim magna. Commodo sunt esse sint qui occaecat excepteur Lorem labore cillum. In in nostrud qui ullamco sunt adipisicing occaecat consequat. Sunt anim non aliquip et elit amet do aliqua tempor reprehenderit in aliqua velit.\r\nCupidatat dolore nisi commodo irure nulla ad. Veniam est sunt laboris nulla commodo adipisicing nostrud in proident ex. Adipisicing elit consequat sint sit sit aliquip ullamco commodo ea consequat est quis. Ea consectetur aliqua sint est irure.\r\nAmet veniam qui ut adipisicing qui quis officia aute ullamco est. Proident ea sit magna commodo. Commodo labore est nulla irure id laborum consequat proident occaecat aute ipsum deserunt dolore.\r\nEnim aute officia minim pariatur id excepteur ad deserunt non mollit nisi dolore. Commodo cillum mollit qui excepteur exercitation quis enim Lorem occaecat excepteur sint adipisicing aliquip. In do excepteur aute ad. Irure dolore nostrud incididunt cupidatat do excepteur ipsum. Non officia labore eu nostrud mollit nisi id sunt velit et consequat duis. Sunt occaecat ipsum magna deserunt quis et ex.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 9,
                    "uuid": "1f18e689-25c9-4070-b29f-a85f2dd3f8a4",
                    "name": "Myrtle Brock",
                    "slug": "myrtle-brock",
                    "email": "myrtlebrock@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "nisi excepteur quis",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-05-31T11:51:45.707 +07:00",
                    "updated_at": "2013-08-04T02:52:02.862 +07:00"
                },
                "created_at": "2014-04-05T00:19:54.534 +07:00",
                "created_by": {
                    "id": 9,
                    "uuid": "8c682e07-e994-44da-b092-1320b5a7a10c",
                    "name": "Courtney Nolan",
                    "slug": "courtney-nolan",
                    "email": "courtneynolan@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "proident",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-10-28T21:02:39.312 +07:00",
                    "updated_at": "2012-09-02T01:53:11.175 +07:00"
                },
                "updated_at": "2013-12-11T15:11:10.440 +08:00",
                "updated_by": {
                    "id": 3,
                    "uuid": "f9985bdd-7cb4-41a2-9172-9b6b6cc0bd17",
                    "name": "Camille Fowler",
                    "slug": "camille-fowler",
                    "email": "camillefowler@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "duis non minim",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-02-10T22:20:16.406 +08:00",
                    "updated_at": "2012-08-14T15:57:23.181 +07:00"
                },
                "published_at": "2012-03-01T14:07:01.273 +08:00",
                "published_by": {
                    "id": 10,
                    "uuid": "9a1a3fdc-f136-4b8c-90ca-5db752b766a6",
                    "name": "Roman Moses",
                    "slug": "roman-moses",
                    "email": "romanmoses@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "adipisicing labore deserunt",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-12-13T00:52:30.181 +08:00",
                    "updated_at": "2014-05-14T21:25:22.772 +07:00"
                },
                "tags": [
                    {
                        "id": 13,
                        "uuid": "9b06a5bc-693b-4d1e-ba3f-023a72b69da2",
                        "name": "enim reprehenderit in",
                        "slug": "enim-reprehenderit-in",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-28T11:04:31.398 +08:00",
                        "created_by": 1,
                        "updated_at": "2014-03-07T02:34:36.865 +08:00",
                        "updated_by": 3
                    },
                    {
                        "id": 48,
                        "uuid": "c7586d5e-edc2-4126-88e7-d97041b1c10b",
                        "name": "est",
                        "slug": "est",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-09-05T16:03:01.051 +07:00",
                        "created_by": 2,
                        "updated_at": "2012-02-17T12:36:23.308 +08:00",
                        "updated_by": 10
                    }
                ]
            },
            {
                "id": 7,
                "uuid": "d9517b26-96cf-40b4-a145-3b16abb8f80b",
                "status": "draft",
                "title": "voluptate ad labore sit nisi nisi eiusmod eiusmod dolore",
                "slug": "voluptate-ad-labore-sit-nisi-nisi-eiusmod-eiusmod-dolore",
                "markdown": "Eiusmod deserunt voluptate deserunt ex voluptate Lorem. Sint duis veniam ea eiusmod aute eu consectetur consectetur cupidatat velit. Commodo ex mollit magna non sunt eiusmod aliquip esse qui voluptate. Occaecat consectetur anim excepteur Lorem sint magna dolore.\r\nDolore non velit pariatur minim ad. Lorem consequat incididunt aliqua enim deserunt eu exercitation Lorem tempor irure dolor minim. Voluptate labore excepteur irure et ipsum nisi consectetur eu labore nulla cupidatat veniam voluptate. Laboris magna labore do est nulla veniam dolor aliquip voluptate consequat do minim eu. Eu irure eu occaecat laborum.\r\nEu adipisicing quis non eu. Occaecat mollit tempor irure anim minim nisi. Tempor cillum amet aute culpa aliqua voluptate sit ex esse excepteur. Incididunt labore anim adipisicing minim cupidatat sit deserunt cillum tempor. Nostrud duis do ipsum minim ex ex occaecat in sint fugiat sunt. Non non nulla aute aliqua cillum enim tempor enim occaecat reprehenderit adipisicing id pariatur.\r\nEt mollit dolore labore irure duis magna esse nulla est quis. Esse proident magna anim sit dolore eiusmod ad esse. Ex dolore excepteur deserunt culpa magna et adipisicing non dolore nisi incididunt qui qui.\r\nLorem officia irure magna Lorem quis amet labore excepteur ea aute aliquip nisi magna. Labore occaecat nisi sunt Lorem proident. Elit cillum eu eiusmod duis elit amet. Esse cupidatat dolor ad eiusmod pariatur consectetur qui ipsum labore velit ea et. Proident quis reprehenderit dolore velit ex consectetur tempor eu. Ullamco minim officia dolore laboris ipsum sint aute est exercitation Lorem. Elit eu mollit cillum sit nisi velit enim anim occaecat ipsum ad.\r\nCupidatat fugiat duis voluptate proident enim ex culpa sit. Magna adipisicing proident deserunt non dolore aute labore deserunt Lorem culpa ad minim. Mollit nisi duis quis consectetur ullamco. Non laborum dolore dolor adipisicing excepteur consectetur est veniam occaecat cillum. Dolor tempor cupidatat enim commodo Lorem amet consequat sit nostrud aliqua excepteur sunt nostrud mollit.\r\nVelit mollit proident veniam ad deserunt enim velit id consequat. Cillum ex reprehenderit cupidatat dolor do. Officia pariatur dolor sit eu nostrud irure duis consequat excepteur. Sunt sunt excepteur deserunt non fugiat commodo enim non. Cupidatat amet ea in sunt proident est id eiusmod. Dolore officia dolore dolore nisi. Aliquip excepteur consectetur voluptate elit nisi veniam nisi id nostrud enim ullamco.\r\n",
                "html": "<p>Eiusmod deserunt voluptate deserunt ex voluptate Lorem. Sint duis veniam ea eiusmod aute eu consectetur consectetur cupidatat velit. Commodo ex mollit magna non sunt eiusmod aliquip esse qui voluptate. Occaecat consectetur anim excepteur Lorem sint magna dolore.\r\nDolore non velit pariatur minim ad. Lorem consequat incididunt aliqua enim deserunt eu exercitation Lorem tempor irure dolor minim. Voluptate labore excepteur irure et ipsum nisi consectetur eu labore nulla cupidatat veniam voluptate. Laboris magna labore do est nulla veniam dolor aliquip voluptate consequat do minim eu. Eu irure eu occaecat laborum.\r\nEu adipisicing quis non eu. Occaecat mollit tempor irure anim minim nisi. Tempor cillum amet aute culpa aliqua voluptate sit ex esse excepteur. Incididunt labore anim adipisicing minim cupidatat sit deserunt cillum tempor. Nostrud duis do ipsum minim ex ex occaecat in sint fugiat sunt. Non non nulla aute aliqua cillum enim tempor enim occaecat reprehenderit adipisicing id pariatur.\r\nEt mollit dolore labore irure duis magna esse nulla est quis. Esse proident magna anim sit dolore eiusmod ad esse. Ex dolore excepteur deserunt culpa magna et adipisicing non dolore nisi incididunt qui qui.\r\nLorem officia irure magna Lorem quis amet labore excepteur ea aute aliquip nisi magna. Labore occaecat nisi sunt Lorem proident. Elit cillum eu eiusmod duis elit amet. Esse cupidatat dolor ad eiusmod pariatur consectetur qui ipsum labore velit ea et. Proident quis reprehenderit dolore velit ex consectetur tempor eu. Ullamco minim officia dolore laboris ipsum sint aute est exercitation Lorem. Elit eu mollit cillum sit nisi velit enim anim occaecat ipsum ad.\r\nCupidatat fugiat duis voluptate proident enim ex culpa sit. Magna adipisicing proident deserunt non dolore aute labore deserunt Lorem culpa ad minim. Mollit nisi duis quis consectetur ullamco. Non laborum dolore dolor adipisicing excepteur consectetur est veniam occaecat cillum. Dolor tempor cupidatat enim commodo Lorem amet consequat sit nostrud aliqua excepteur sunt nostrud mollit.\r\nVelit mollit proident veniam ad deserunt enim velit id consequat. Cillum ex reprehenderit cupidatat dolor do. Officia pariatur dolor sit eu nostrud irure duis consequat excepteur. Sunt sunt excepteur deserunt non fugiat commodo enim non. Cupidatat amet ea in sunt proident est id eiusmod. Dolore officia dolore dolore nisi. Aliquip excepteur consectetur voluptate elit nisi veniam nisi id nostrud enim ullamco.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 2,
                    "uuid": "07d59bbf-693f-4bf2-84f1-d95675d910e7",
                    "name": "Cortez Robinson",
                    "slug": "cortez-robinson",
                    "email": "cortezrobinson@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "eu elit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-03-26T04:49:08.086 +07:00",
                    "updated_at": "2013-04-23T00:42:02.931 +07:00"
                },
                "created_at": "2013-06-19T22:03:04.221 +07:00",
                "created_by": {
                    "id": 6,
                    "uuid": "e121421e-ade4-43fe-a49c-165b4e121679",
                    "name": "Marcy Schroeder",
                    "slug": "marcy-schroeder",
                    "email": "marcyschroeder@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "officia nostrud magna",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-23T00:11:47.653 +07:00",
                    "updated_at": "2012-02-12T03:12:41.039 +08:00"
                },
                "updated_at": "2012-10-25T11:17:33.320 +07:00",
                "updated_by": {
                    "id": 2,
                    "uuid": "240aee01-b0a1-4fab-b85d-0bdde7f6eaa5",
                    "name": "Duffy Gordon",
                    "slug": "duffy-gordon",
                    "email": "duffygordon@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "tempor",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-06-23T19:00:05.954 +07:00",
                    "updated_at": "2012-01-08T07:10:39.746 +08:00"
                },
                "published_at": "2013-05-15T12:49:59.297 +07:00",
                "published_by": {
                    "id": 10,
                    "uuid": "ac72c6c0-fced-4c26-91ff-f466bddc2842",
                    "name": "Nguyen Gentry",
                    "slug": "nguyen-gentry",
                    "email": "nguyengentry@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "velit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-01-08T19:19:09.493 +08:00",
                    "updated_at": "2012-09-21T23:53:52.014 +07:00"
                },
                "tags": [
                    {
                        "id": 40,
                        "uuid": "9c7b88c2-8cfb-4909-9408-8643674f2741",
                        "name": "exercitation",
                        "slug": "exercitation",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-12-26T19:27:56.163 +08:00",
                        "created_by": 0,
                        "updated_at": "2013-12-25T13:03:01.170 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 1,
                        "uuid": "31d15ab1-4f35-498a-af9a-9a9e7b803a10",
                        "name": "officia amet",
                        "slug": "officia-amet",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-20T09:06:19.757 +08:00",
                        "created_by": 0,
                        "updated_at": "2013-09-22T17:12:32.716 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 34,
                        "uuid": "5eae6810-d59e-4d86-9332-867744a915bd",
                        "name": "et esse aute",
                        "slug": "et-esse-aute",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-09-27T00:53:13.275 +07:00",
                        "created_by": 0,
                        "updated_at": "2012-02-25T05:46:07.270 +08:00",
                        "updated_by": 3
                    },
                    {
                        "id": 75,
                        "uuid": "082c4e9c-7037-4866-80d0-317d44fde327",
                        "name": "labore sint ipsum",
                        "slug": "labore-sint-ipsum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-31T11:43:56.727 +08:00",
                        "created_by": 7,
                        "updated_at": "2012-12-01T01:06:32.380 +08:00",
                        "updated_by": 8
                    },
                    {
                        "id": 24,
                        "uuid": "00842c8b-18dd-4a33-8585-2304373d5308",
                        "name": "sint ad pariatur",
                        "slug": "sint-ad-pariatur",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-01-15T03:19:53.444 +08:00",
                        "created_by": 4,
                        "updated_at": "2013-05-25T17:10:27.626 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 47,
                        "uuid": "2a9c41c0-6d11-4a6d-89be-78d3925b8c42",
                        "name": "aliqua dolor",
                        "slug": "aliqua-dolor",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-04-26T20:33:03.574 +07:00",
                        "created_by": 1,
                        "updated_at": "2013-10-31T12:17:45.676 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 73,
                        "uuid": "444b22e7-1eb3-4e23-83df-54bfc095047f",
                        "name": "eu reprehenderit aliquip",
                        "slug": "eu-reprehenderit-aliquip",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-05-18T03:33:52.776 +07:00",
                        "created_by": 1,
                        "updated_at": "2013-08-08T01:39:20.226 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 75,
                        "uuid": "a0d5f2bb-8fb6-409a-b670-2b77113cee26",
                        "name": "aliqua ipsum",
                        "slug": "aliqua-ipsum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-06-11T03:50:48.040 +07:00",
                        "created_by": 4,
                        "updated_at": "2013-08-03T16:23:21.860 +07:00",
                        "updated_by": 10
                    },
                    {
                        "id": 98,
                        "uuid": "6b03776c-b490-4df1-bbb8-14f18a540dc0",
                        "name": "irure",
                        "slug": "irure",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-05-17T16:04:56.085 +07:00",
                        "created_by": 8,
                        "updated_at": "2012-11-16T06:23:15.001 +08:00",
                        "updated_by": 8
                    }
                ]
            },
            {
                "id": 8,
                "uuid": "861c6e61-3625-420a-9b41-b4bd6406d031",
                "status": "draft",
                "title": "mollit do laboris sit deserunt tempor",
                "slug": "mollit-do-laboris-sit-deserunt-tempor",
                "markdown": "Ea anim sit ad id eiusmod reprehenderit. Anim enim esse exercitation ipsum mollit laborum sit voluptate ea. Do quis reprehenderit reprehenderit velit sit eu et labore incididunt. Dolore officia quis deserunt sunt aute adipisicing.\r\nQui aliqua aliqua ut id anim duis ullamco commodo. Excepteur ex mollit qui incididunt excepteur et ipsum culpa magna veniam sint consequat proident ea. Irure pariatur non eu eu laborum tempor.\r\n",
                "html": "<p>Ea anim sit ad id eiusmod reprehenderit. Anim enim esse exercitation ipsum mollit laborum sit voluptate ea. Do quis reprehenderit reprehenderit velit sit eu et labore incididunt. Dolore officia quis deserunt sunt aute adipisicing.\r\nQui aliqua aliqua ut id anim duis ullamco commodo. Excepteur ex mollit qui incididunt excepteur et ipsum culpa magna veniam sint consequat proident ea. Irure pariatur non eu eu laborum tempor.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 1,
                    "uuid": "c23b5b10-5d8e-4014-9bef-77076c972bb9",
                    "name": "Lynn Pacheco",
                    "slug": "lynn-pacheco",
                    "email": "lynnpacheco@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "laboris est",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-07-13T05:10:39.330 +07:00",
                    "updated_at": "2013-12-26T08:19:16.926 +08:00"
                },
                "created_at": "2013-10-29T05:31:02.451 +07:00",
                "created_by": {
                    "id": 6,
                    "uuid": "013fb598-dfc8-465e-9c63-0627c9fcbdd7",
                    "name": "Cooper Maddox",
                    "slug": "cooper-maddox",
                    "email": "coopermaddox@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "voluptate eiusmod",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-08-21T01:46:18.839 +07:00",
                    "updated_at": "2012-08-09T06:30:20.420 +07:00"
                },
                "updated_at": "2012-03-19T21:26:26.415 +07:00",
                "updated_by": {
                    "id": 7,
                    "uuid": "4d3ea2af-b429-4d7d-8770-0ed805859c0a",
                    "name": "Graciela Osborn",
                    "slug": "graciela-osborn",
                    "email": "gracielaosborn@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "adipisicing",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-12-23T08:25:45.701 +08:00",
                    "updated_at": "2013-02-10T17:54:34.512 +08:00"
                },
                "published_at": "2013-11-13T06:45:28.985 +08:00",
                "published_by": {
                    "id": 8,
                    "uuid": "1620c095-5898-4825-90cf-46d69186335c",
                    "name": "Church Rodriquez",
                    "slug": "church-rodriquez",
                    "email": "churchrodriquez@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ea anim sint",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-08-05T11:28:06.773 +07:00",
                    "updated_at": "2013-02-04T01:52:07.555 +08:00"
                },
                "tags": [
                    {
                        "id": 20,
                        "uuid": "43457c30-9b05-4697-9915-40e13e4cfced",
                        "name": "consequat",
                        "slug": "consequat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-16T18:41:48.787 +08:00",
                        "created_by": 6,
                        "updated_at": "2012-06-15T05:23:05.111 +07:00",
                        "updated_by": 10
                    },
                    {
                        "id": 15,
                        "uuid": "785cf157-e8f5-42a2-a2c9-64a5aefc99eb",
                        "name": "ut laboris amet",
                        "slug": "ut-laboris-amet",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-18T09:11:43.064 +07:00",
                        "created_by": 0,
                        "updated_at": "2012-02-18T00:03:23.693 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 31,
                        "uuid": "d875c5f2-040f-46fe-9fd5-4c68a5996a5e",
                        "name": "consequat non consequat",
                        "slug": "consequat-non-consequat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-05-31T22:50:07.847 +07:00",
                        "created_by": 10,
                        "updated_at": "2014-04-03T10:39:10.148 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 74,
                        "uuid": "8e9a03b9-a60f-44f7-a4f2-97b9c40d2179",
                        "name": "deserunt consectetur Lorem",
                        "slug": "deserunt-consectetur-lorem",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-05-20T20:59:07.969 +07:00",
                        "created_by": 7,
                        "updated_at": "2013-03-03T23:43:30.787 +08:00",
                        "updated_by": 0
                    },
                    {
                        "id": 41,
                        "uuid": "ad42e4d3-026e-4b5b-9982-31045c27199a",
                        "name": "ad",
                        "slug": "ad",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-03-05T02:26:48.696 +08:00",
                        "created_by": 5,
                        "updated_at": "2013-09-17T08:52:34.282 +07:00",
                        "updated_by": 8
                    },
                    {
                        "id": 4,
                        "uuid": "9a349c1d-d1a4-476e-81b2-f7fc1eb8ed81",
                        "name": "dolore",
                        "slug": "dolore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-11T06:21:47.852 +07:00",
                        "created_by": 2,
                        "updated_at": "2014-03-18T04:44:27.836 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 53,
                        "uuid": "3a0cc340-7641-42cc-93e3-6c770de5f6b0",
                        "name": "aute in",
                        "slug": "aute-in",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-02-16T04:42:47.058 +08:00",
                        "created_by": 3,
                        "updated_at": "2012-01-27T18:00:04.249 +08:00",
                        "updated_by": 9
                    }
                ]
            },
            {
                "id": 9,
                "uuid": "c160b74b-0b4d-478a-8412-a35ae6c924a8",
                "status": "published",
                "title": "veniam labore Lorem proident exercitation ea duis deserunt ipsum nulla",
                "slug": "veniam-labore-Lorem-proident-exercitation-ea-duis-deserunt-ipsum-nulla",
                "markdown": "Id deserunt adipisicing est sint officia laboris ullamco veniam pariatur non deserunt Lorem Lorem. Sit dolore dolor fugiat et eu aliqua deserunt deserunt do sunt cillum officia deserunt ea. Et deserunt fugiat deserunt commodo quis sint cillum ullamco ut dolor ad. Ad duis consequat exercitation minim fugiat.\r\nDolor in velit id non consequat ullamco aliqua officia aliqua tempor eu deserunt. Eu nisi officia id mollit dolor laboris quis eu incididunt adipisicing esse anim. Consectetur pariatur nisi amet elit reprehenderit.\r\nSit velit veniam deserunt minim anim incididunt ad. Enim dolor amet consectetur qui. Ipsum ea cupidatat laboris duis nulla enim.\r\nOfficia cillum esse occaecat labore duis labore labore eu sit dolor incididunt. Dolor exercitation adipisicing pariatur elit enim excepteur sit aliquip exercitation ipsum sunt ex est. Aliquip deserunt reprehenderit cupidatat cillum elit. Minim tempor commodo eu est laborum incididunt id sit adipisicing ad fugiat cupidatat esse irure. Incididunt tempor irure tempor eu id do. Laboris mollit duis mollit qui qui. Incididunt cupidatat nostrud et cillum.\r\n",
                "html": "<p>Id deserunt adipisicing est sint officia laboris ullamco veniam pariatur non deserunt Lorem Lorem. Sit dolore dolor fugiat et eu aliqua deserunt deserunt do sunt cillum officia deserunt ea. Et deserunt fugiat deserunt commodo quis sint cillum ullamco ut dolor ad. Ad duis consequat exercitation minim fugiat.\r\nDolor in velit id non consequat ullamco aliqua officia aliqua tempor eu deserunt. Eu nisi officia id mollit dolor laboris quis eu incididunt adipisicing esse anim. Consectetur pariatur nisi amet elit reprehenderit.\r\nSit velit veniam deserunt minim anim incididunt ad. Enim dolor amet consectetur qui. Ipsum ea cupidatat laboris duis nulla enim.\r\nOfficia cillum esse occaecat labore duis labore labore eu sit dolor incididunt. Dolor exercitation adipisicing pariatur elit enim excepteur sit aliquip exercitation ipsum sunt ex est. Aliquip deserunt reprehenderit cupidatat cillum elit. Minim tempor commodo eu est laborum incididunt id sit adipisicing ad fugiat cupidatat esse irure. Incididunt tempor irure tempor eu id do. Laboris mollit duis mollit qui qui. Incididunt cupidatat nostrud et cillum.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 3,
                    "uuid": "371b8ce4-1cf9-421e-896b-208f7e25163a",
                    "name": "Sharon Keller",
                    "slug": "sharon-keller",
                    "email": "sharonkeller@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "mollit qui id",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-08-10T21:56:07.881 +07:00",
                    "updated_at": "2012-04-13T08:05:20.852 +07:00"
                },
                "created_at": "2013-05-07T06:11:55.308 +07:00",
                "created_by": {
                    "id": 9,
                    "uuid": "10c61457-d814-4a5f-8453-8487787fb1ac",
                    "name": "Elsa Gaines",
                    "slug": "elsa-gaines",
                    "email": "elsagaines@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "cillum officia",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-03-27T09:36:50.741 +07:00",
                    "updated_at": "2013-10-26T08:37:34.156 +07:00"
                },
                "updated_at": "2012-12-05T13:25:48.507 +08:00",
                "updated_by": {
                    "id": 1,
                    "uuid": "f69deaa8-aae1-457e-8a36-6e39d3c5b974",
                    "name": "Jillian Hays",
                    "slug": "jillian-hays",
                    "email": "jillianhays@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "labore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-05-13T12:05:48.778 +07:00",
                    "updated_at": "2012-08-01T05:21:33.751 +07:00"
                },
                "published_at": "2012-02-08T12:07:32.150 +08:00",
                "published_by": {
                    "id": 5,
                    "uuid": "e436002b-53d6-43c9-bec0-3ab6a934840a",
                    "name": "Yvette Mayo",
                    "slug": "yvette-mayo",
                    "email": "yvettemayo@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "aliqua aliqua",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-02-15T18:36:23.475 +08:00",
                    "updated_at": "2013-11-27T07:01:49.675 +08:00"
                },
                "tags": [
                    {
                        "id": 99,
                        "uuid": "e70d7702-edc5-477b-97f9-18eb69125455",
                        "name": "labore",
                        "slug": "labore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-08-05T11:05:36.531 +07:00",
                        "created_by": 6,
                        "updated_at": "2012-01-10T20:39:19.468 +08:00",
                        "updated_by": 2
                    },
                    {
                        "id": 76,
                        "uuid": "103d29c3-9f5c-42bb-8f5e-d5ab064e959f",
                        "name": "aliqua",
                        "slug": "aliqua",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-22T06:20:45.322 +08:00",
                        "created_by": 6,
                        "updated_at": "2013-12-03T16:06:42.401 +08:00",
                        "updated_by": 1
                    },
                    {
                        "id": 57,
                        "uuid": "41208f83-7295-4f75-a2a3-49e96ad28cb6",
                        "name": "eu",
                        "slug": "eu",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-01-26T02:05:20.212 +08:00",
                        "created_by": 3,
                        "updated_at": "2013-09-29T01:58:53.339 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 61,
                        "uuid": "ea0ed9f2-b041-47f9-9ba9-35e8c11412bd",
                        "name": "in non cupidatat",
                        "slug": "in-non-cupidatat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-12-04T08:10:52.408 +08:00",
                        "created_by": 10,
                        "updated_at": "2013-03-09T08:22:28.138 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 69,
                        "uuid": "a6b53b37-77d9-4a47-8e46-bd068a4bc83e",
                        "name": "est in ea",
                        "slug": "est-in-ea",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-06T18:42:19.021 +07:00",
                        "created_by": 6,
                        "updated_at": "2012-11-06T23:49:44.297 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 7,
                        "uuid": "483406dd-f89b-4033-8d53-40e379c60342",
                        "name": "deserunt",
                        "slug": "deserunt",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-03-29T15:52:52.186 +07:00",
                        "created_by": 0,
                        "updated_at": "2013-06-14T02:09:30.538 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 65,
                        "uuid": "7665e9d4-903b-467d-93cb-afcfd9327874",
                        "name": "esse tempor nulla",
                        "slug": "esse-tempor-nulla",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-12-12T07:24:15.845 +08:00",
                        "created_by": 0,
                        "updated_at": "2013-09-01T08:15:00.444 +07:00",
                        "updated_by": 8
                    },
                    {
                        "id": 95,
                        "uuid": "4954ae3d-2eac-4911-bd83-f353432e2992",
                        "name": "reprehenderit Lorem",
                        "slug": "reprehenderit-lorem",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-29T15:32:57.396 +08:00",
                        "created_by": 10,
                        "updated_at": "2014-04-13T17:36:34.738 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 24,
                        "uuid": "0555698a-c51c-4267-a9ab-0c6f48138f1c",
                        "name": "fugiat",
                        "slug": "fugiat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-11T20:11:37.969 +07:00",
                        "created_by": 7,
                        "updated_at": "2014-01-24T19:55:36.937 +08:00",
                        "updated_by": 0
                    }
                ]
            },
            {
                "id": 10,
                "uuid": "55044390-ef75-425f-9e88-9429ea6101a3",
                "status": "draft",
                "title": "officia consectetur labore minim",
                "slug": "officia-consectetur-labore-minim",
                "markdown": "Ad aliquip consequat tempor incididunt in excepteur quis tempor nostrud labore velit. Qui excepteur do ad incididunt voluptate. Ad reprehenderit laboris voluptate voluptate non cupidatat commodo.\r\nAdipisicing non fugiat ullamco irure quis eiusmod laborum officia. Do officia cillum magna nulla proident duis cupidatat ipsum sint laborum et id non sunt. Reprehenderit est minim aliqua excepteur amet qui laborum est et aute enim. Laborum deserunt ad est do labore labore consequat culpa et qui non eu cillum dolor. Est pariatur laborum officia nostrud mollit adipisicing esse proident in. Veniam pariatur nulla nostrud dolor cupidatat sit duis quis.\r\nNulla nisi dolore exercitation ad aliqua eu tempor nisi elit et non incididunt Lorem. Sunt laborum cupidatat in sint commodo cupidatat ipsum tempor. Anim ipsum esse ipsum nisi.\r\nEnim minim ut pariatur in irure sit. Occaecat aliquip dolore aute sint nisi eu eu occaecat fugiat eiusmod. Dolore laboris velit pariatur amet. Ipsum irure ea aliquip adipisicing.\r\nOccaecat est quis nisi culpa amet aliquip. Elit dolor officia sunt do cupidatat labore nostrud enim nostrud aliquip. Mollit consectetur irure Lorem nulla velit. In amet ex culpa aliquip enim. Reprehenderit pariatur proident incididunt magna irure in commodo et pariatur dolor non ut. Commodo eu eu sint minim deserunt dolore do culpa anim ad anim consequat. In nulla esse cillum enim eu mollit do mollit nostrud dolor pariatur ea eu Lorem.\r\nIn Lorem fugiat eu est nostrud duis anim labore amet. Proident tempor magna Lorem excepteur. Velit eiusmod ipsum ea ipsum labore ea exercitation eu ad sint adipisicing occaecat.\r\nCommodo nisi tempor voluptate veniam incididunt nostrud ipsum occaecat culpa reprehenderit quis officia laboris incididunt. Reprehenderit consectetur sint laborum reprehenderit ex cupidatat aliqua mollit. Reprehenderit eu consequat et dolore eu. Proident dolor reprehenderit sint veniam sunt labore et ex laboris eu aliqua proident. Tempor fugiat laboris ullamco aliqua officia in esse aliqua. Excepteur do sit duis incididunt dolor culpa sint amet ex Lorem. Ipsum magna deserunt ea sit aute dolor excepteur culpa dolore eu eiusmod.\r\nEiusmod ut anim culpa adipisicing labore adipisicing laboris et eiusmod ut. Amet ea duis duis qui consectetur eiusmod amet. Consequat tempor consectetur pariatur consequat officia qui officia proident. Est voluptate et consectetur in amet laboris magna aute fugiat sunt anim. Et nulla id incididunt id.\r\nSit non ad eu tempor nisi cupidatat exercitation est exercitation Lorem Lorem ex consectetur. Ex veniam fugiat excepteur exercitation culpa ad minim pariatur consectetur. Officia irure deserunt excepteur exercitation labore aliqua exercitation do non do. Ut mollit sunt velit occaecat ex do tempor. Occaecat elit eiusmod ea tempor quis irure Lorem duis fugiat esse ut commodo cillum. Anim do pariatur excepteur exercitation incididunt nisi irure commodo cillum nisi proident aliqua do.\r\nMagna dolore dolore consectetur in ex ea cillum consectetur officia adipisicing reprehenderit velit. Eu eu ipsum commodo anim irure aliqua ea culpa elit nostrud Lorem deserunt dolor nisi. Dolore veniam ex eu enim cupidatat deserunt commodo est dolore est reprehenderit veniam voluptate anim.\r\n",
                "html": "<p>Ad aliquip consequat tempor incididunt in excepteur quis tempor nostrud labore velit. Qui excepteur do ad incididunt voluptate. Ad reprehenderit laboris voluptate voluptate non cupidatat commodo.\r\nAdipisicing non fugiat ullamco irure quis eiusmod laborum officia. Do officia cillum magna nulla proident duis cupidatat ipsum sint laborum et id non sunt. Reprehenderit est minim aliqua excepteur amet qui laborum est et aute enim. Laborum deserunt ad est do labore labore consequat culpa et qui non eu cillum dolor. Est pariatur laborum officia nostrud mollit adipisicing esse proident in. Veniam pariatur nulla nostrud dolor cupidatat sit duis quis.\r\nNulla nisi dolore exercitation ad aliqua eu tempor nisi elit et non incididunt Lorem. Sunt laborum cupidatat in sint commodo cupidatat ipsum tempor. Anim ipsum esse ipsum nisi.\r\nEnim minim ut pariatur in irure sit. Occaecat aliquip dolore aute sint nisi eu eu occaecat fugiat eiusmod. Dolore laboris velit pariatur amet. Ipsum irure ea aliquip adipisicing.\r\nOccaecat est quis nisi culpa amet aliquip. Elit dolor officia sunt do cupidatat labore nostrud enim nostrud aliquip. Mollit consectetur irure Lorem nulla velit. In amet ex culpa aliquip enim. Reprehenderit pariatur proident incididunt magna irure in commodo et pariatur dolor non ut. Commodo eu eu sint minim deserunt dolore do culpa anim ad anim consequat. In nulla esse cillum enim eu mollit do mollit nostrud dolor pariatur ea eu Lorem.\r\nIn Lorem fugiat eu est nostrud duis anim labore amet. Proident tempor magna Lorem excepteur. Velit eiusmod ipsum ea ipsum labore ea exercitation eu ad sint adipisicing occaecat.\r\nCommodo nisi tempor voluptate veniam incididunt nostrud ipsum occaecat culpa reprehenderit quis officia laboris incididunt. Reprehenderit consectetur sint laborum reprehenderit ex cupidatat aliqua mollit. Reprehenderit eu consequat et dolore eu. Proident dolor reprehenderit sint veniam sunt labore et ex laboris eu aliqua proident. Tempor fugiat laboris ullamco aliqua officia in esse aliqua. Excepteur do sit duis incididunt dolor culpa sint amet ex Lorem. Ipsum magna deserunt ea sit aute dolor excepteur culpa dolore eu eiusmod.\r\nEiusmod ut anim culpa adipisicing labore adipisicing laboris et eiusmod ut. Amet ea duis duis qui consectetur eiusmod amet. Consequat tempor consectetur pariatur consequat officia qui officia proident. Est voluptate et consectetur in amet laboris magna aute fugiat sunt anim. Et nulla id incididunt id.\r\nSit non ad eu tempor nisi cupidatat exercitation est exercitation Lorem Lorem ex consectetur. Ex veniam fugiat excepteur exercitation culpa ad minim pariatur consectetur. Officia irure deserunt excepteur exercitation labore aliqua exercitation do non do. Ut mollit sunt velit occaecat ex do tempor. Occaecat elit eiusmod ea tempor quis irure Lorem duis fugiat esse ut commodo cillum. Anim do pariatur excepteur exercitation incididunt nisi irure commodo cillum nisi proident aliqua do.\r\nMagna dolore dolore consectetur in ex ea cillum consectetur officia adipisicing reprehenderit velit. Eu eu ipsum commodo anim irure aliqua ea culpa elit nostrud Lorem deserunt dolor nisi. Dolore veniam ex eu enim cupidatat deserunt commodo est dolore est reprehenderit veniam voluptate anim.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 3,
                    "uuid": "a9925c2b-147c-478b-8dc3-7e77933fcbd8",
                    "name": "Milagros Delaney",
                    "slug": "milagros-delaney",
                    "email": "milagrosdelaney@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "sint in adipisicing",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-11-23T13:27:34.240 +08:00",
                    "updated_at": "2013-07-12T08:50:20.290 +07:00"
                },
                "created_at": "2013-06-13T00:09:13.608 +07:00",
                "created_by": {
                    "id": 2,
                    "uuid": "da2544f7-e1aa-4050-a0b9-9a9921c9ee65",
                    "name": "Joyce Hayden",
                    "slug": "joyce-hayden",
                    "email": "joycehayden@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "cillum commodo",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-02-12T19:53:18.778 +08:00",
                    "updated_at": "2013-11-14T13:20:08.030 +08:00"
                },
                "updated_at": "2013-01-18T09:01:21.174 +08:00",
                "updated_by": {
                    "id": 7,
                    "uuid": "1353ee31-cf9c-4703-95c5-a4d531fb871c",
                    "name": "Deirdre Wiggins",
                    "slug": "deirdre-wiggins",
                    "email": "deirdrewiggins@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "enim",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-20T01:04:42.093 +07:00",
                    "updated_at": "2012-03-15T18:53:43.790 +07:00"
                },
                "published_at": "2012-05-12T16:54:31.001 +07:00",
                "published_by": {
                    "id": 1,
                    "uuid": "2c6d483c-78b1-49c4-a704-83aad801d8d8",
                    "name": "Alexandra Wilkins",
                    "slug": "alexandra-wilkins",
                    "email": "alexandrawilkins@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "enim",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-02-03T08:53:27.352 +08:00",
                    "updated_at": "2014-01-15T07:02:54.193 +08:00"
                },
                "tags": [
                    {
                        "id": 79,
                        "uuid": "5f56c219-ddcc-470b-b77f-79c7bee668fa",
                        "name": "aliquip",
                        "slug": "aliquip",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-06-24T22:26:39.654 +07:00",
                        "created_by": 5,
                        "updated_at": "2012-05-25T05:41:19.608 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 71,
                        "uuid": "6da0e758-e2ac-4606-acd4-74039498129b",
                        "name": "nisi aliquip",
                        "slug": "nisi-aliquip",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-04-22T17:16:20.867 +07:00",
                        "created_by": 7,
                        "updated_at": "2013-02-15T07:38:53.283 +08:00",
                        "updated_by": 5
                    },
                    {
                        "id": 79,
                        "uuid": "b2b99644-49d5-4d79-911f-b06c3b12a761",
                        "name": "elit ullamco",
                        "slug": "elit-ullamco",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-02-26T14:28:09.877 +08:00",
                        "created_by": 4,
                        "updated_at": "2012-04-09T10:32:59.287 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 40,
                        "uuid": "69faa821-ea35-48a0-9dfa-4398531fe36a",
                        "name": "laboris in exercitation",
                        "slug": "laboris-in-exercitation",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-07-14T22:45:50.712 +07:00",
                        "created_by": 9,
                        "updated_at": "2014-04-26T13:06:29.042 +07:00",
                        "updated_by": 10
                    },
                    {
                        "id": 99,
                        "uuid": "ad7146b5-93cf-466d-aeb1-c00060c1240f",
                        "name": "proident excepteur in",
                        "slug": "proident-excepteur-in",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-10-16T17:40:11.347 +07:00",
                        "created_by": 5,
                        "updated_at": "2013-07-29T23:59:12.607 +07:00",
                        "updated_by": 1
                    },
                    {
                        "id": 35,
                        "uuid": "8c18820c-7832-40c3-ba84-6821dee7118e",
                        "name": "ea pariatur",
                        "slug": "ea-pariatur",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-09T04:27:29.022 +08:00",
                        "created_by": 6,
                        "updated_at": "2013-01-30T10:55:23.196 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 70,
                        "uuid": "d90bb189-d56c-457d-be22-abd5b0666aec",
                        "name": "minim minim",
                        "slug": "minim-minim",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-05-15T13:39:08.095 +07:00",
                        "created_by": 2,
                        "updated_at": "2012-07-24T01:45:47.292 +07:00",
                        "updated_by": 5
                    }
                ]
            },
            {
                "id": 11,
                "uuid": "c91aa3f8-ff48-4553-9888-77248a9aa6b0",
                "status": "draft",
                "title": "Lorem velit velit nulla pariatur laboris",
                "slug": "Lorem-velit-velit-nulla-pariatur-laboris",
                "markdown": "Est adipisicing deserunt proident nostrud anim laboris duis consectetur sunt proident aute. Nostrud dolor deserunt sint duis eiusmod anim ipsum occaecat ad quis irure ex anim. In Lorem laboris irure aliqua.\r\nNostrud id eiusmod culpa ipsum ad enim est cupidatat. Aute culpa laboris esse culpa nisi minim esse laboris proident sint aute ea eiusmod. In laboris incididunt eu aliqua sit aute laborum dolore. Voluptate est esse incididunt est cillum ut aliquip incididunt do officia fugiat fugiat officia elit.\r\nAnim tempor anim tempor officia dolor. Ut occaecat eiusmod adipisicing officia ea. Minim pariatur dolore labore Lorem aute.\r\nQuis excepteur voluptate ipsum amet nostrud sunt deserunt Lorem. Labore aliquip proident labore velit consectetur culpa reprehenderit occaecat ut. Culpa laborum cupidatat pariatur magna duis eiusmod consequat. Nulla commodo non eiusmod veniam elit nostrud. Excepteur pariatur esse ipsum ad tempor consectetur anim ut eiusmod. Ipsum nisi nulla pariatur eu excepteur id cupidatat aute. Minim exercitation sit officia do proident duis nulla cillum ad voluptate voluptate nisi ad labore.\r\nAnim nostrud est ad anim proident. Ad velit ex aliqua proident incididunt cupidatat consequat ipsum amet eu. Ullamco deserunt laboris eu est qui magna occaecat commodo eiusmod cupidatat amet sunt irure non.\r\nLaboris in elit proident culpa qui commodo eiusmod duis. Voluptate id laborum veniam mollit do eu dolor nisi aliquip sint quis. Excepteur sit deserunt sit culpa sit pariatur ad cupidatat cillum enim sit. Et reprehenderit anim irure veniam. Anim ipsum ipsum qui amet laborum.\r\nCulpa dolore ad culpa reprehenderit excepteur non ut sunt mollit. Nostrud minim velit ullamco dolore nostrud reprehenderit proident in exercitation esse duis. Nostrud sit commodo ipsum quis labore nostrud. Do commodo sint nisi voluptate fugiat nostrud nisi esse ex est. Proident adipisicing sit ea veniam id exercitation ea dolore. Incididunt culpa minim fugiat veniam laboris ea sint adipisicing tempor in elit.\r\nUt exercitation mollit proident id aliqua elit. Non tempor commodo dolor laborum eu sit. Velit consectetur cillum mollit in mollit exercitation non ad eiusmod reprehenderit in. Qui eu est ullamco sunt.\r\nReprehenderit ad sint cillum sit ipsum. Ea qui excepteur adipisicing duis aute. Deserunt laboris Lorem sunt cupidatat aute ullamco est amet aute. Excepteur elit commodo excepteur reprehenderit excepteur fugiat fugiat excepteur officia reprehenderit incididunt voluptate. Laborum commodo exercitation velit nisi officia laborum minim tempor consequat. Aute Lorem eu Lorem consequat officia est labore ad cupidatat ex consequat minim commodo. Irure anim non duis sint officia.\r\n",
                "html": "<p>Est adipisicing deserunt proident nostrud anim laboris duis consectetur sunt proident aute. Nostrud dolor deserunt sint duis eiusmod anim ipsum occaecat ad quis irure ex anim. In Lorem laboris irure aliqua.\r\nNostrud id eiusmod culpa ipsum ad enim est cupidatat. Aute culpa laboris esse culpa nisi minim esse laboris proident sint aute ea eiusmod. In laboris incididunt eu aliqua sit aute laborum dolore. Voluptate est esse incididunt est cillum ut aliquip incididunt do officia fugiat fugiat officia elit.\r\nAnim tempor anim tempor officia dolor. Ut occaecat eiusmod adipisicing officia ea. Minim pariatur dolore labore Lorem aute.\r\nQuis excepteur voluptate ipsum amet nostrud sunt deserunt Lorem. Labore aliquip proident labore velit consectetur culpa reprehenderit occaecat ut. Culpa laborum cupidatat pariatur magna duis eiusmod consequat. Nulla commodo non eiusmod veniam elit nostrud. Excepteur pariatur esse ipsum ad tempor consectetur anim ut eiusmod. Ipsum nisi nulla pariatur eu excepteur id cupidatat aute. Minim exercitation sit officia do proident duis nulla cillum ad voluptate voluptate nisi ad labore.\r\nAnim nostrud est ad anim proident. Ad velit ex aliqua proident incididunt cupidatat consequat ipsum amet eu. Ullamco deserunt laboris eu est qui magna occaecat commodo eiusmod cupidatat amet sunt irure non.\r\nLaboris in elit proident culpa qui commodo eiusmod duis. Voluptate id laborum veniam mollit do eu dolor nisi aliquip sint quis. Excepteur sit deserunt sit culpa sit pariatur ad cupidatat cillum enim sit. Et reprehenderit anim irure veniam. Anim ipsum ipsum qui amet laborum.\r\nCulpa dolore ad culpa reprehenderit excepteur non ut sunt mollit. Nostrud minim velit ullamco dolore nostrud reprehenderit proident in exercitation esse duis. Nostrud sit commodo ipsum quis labore nostrud. Do commodo sint nisi voluptate fugiat nostrud nisi esse ex est. Proident adipisicing sit ea veniam id exercitation ea dolore. Incididunt culpa minim fugiat veniam laboris ea sint adipisicing tempor in elit.\r\nUt exercitation mollit proident id aliqua elit. Non tempor commodo dolor laborum eu sit. Velit consectetur cillum mollit in mollit exercitation non ad eiusmod reprehenderit in. Qui eu est ullamco sunt.\r\nReprehenderit ad sint cillum sit ipsum. Ea qui excepteur adipisicing duis aute. Deserunt laboris Lorem sunt cupidatat aute ullamco est amet aute. Excepteur elit commodo excepteur reprehenderit excepteur fugiat fugiat excepteur officia reprehenderit incididunt voluptate. Laborum commodo exercitation velit nisi officia laborum minim tempor consequat. Aute Lorem eu Lorem consequat officia est labore ad cupidatat ex consequat minim commodo. Irure anim non duis sint officia.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 1,
                    "uuid": "e61d17b3-eb07-42f9-b0c8-f86acc667d53",
                    "name": "Moore Daniel",
                    "slug": "moore-daniel",
                    "email": "mooredaniel@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "sint sint",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-10-24T17:19:44.644 +07:00",
                    "updated_at": "2012-09-24T13:29:03.895 +07:00"
                },
                "created_at": "2013-07-04T12:55:44.854 +07:00",
                "created_by": {
                    "id": 8,
                    "uuid": "06b6bc63-cd53-446d-9d7d-a846876ea259",
                    "name": "Mae Garrison",
                    "slug": "mae-garrison",
                    "email": "maegarrison@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "cillum ipsum nisi",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-03-30T17:54:48.446 +07:00",
                    "updated_at": "2013-09-23T07:04:41.042 +07:00"
                },
                "updated_at": "2013-02-09T15:17:59.035 +08:00",
                "updated_by": {
                    "id": 8,
                    "uuid": "14ac6ef3-f081-4092-bd69-1d4b2fc057c8",
                    "name": "Matthews Barry",
                    "slug": "matthews-barry",
                    "email": "matthewsbarry@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ipsum veniam consectetur",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-02T22:42:02.882 +07:00",
                    "updated_at": "2013-05-19T05:14:39.505 +07:00"
                },
                "published_at": "2012-03-21T10:29:49.847 +07:00",
                "published_by": {
                    "id": 1,
                    "uuid": "feaea385-4560-4157-bf0a-f64dd2988eaa",
                    "name": "Susan Chang",
                    "slug": "susan-chang",
                    "email": "susanchang@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "aliqua",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-10-28T13:18:16.634 +07:00",
                    "updated_at": "2012-11-27T09:00:20.453 +08:00"
                },
                "tags": []
            },
            {
                "id": 12,
                "uuid": "7ba83e2b-fb63-4c35-bcaf-831a1db5a953",
                "status": "published",
                "title": "elit nisi qui eiusmod commodo reprehenderit sint esse",
                "slug": "elit-nisi-qui-eiusmod-commodo-reprehenderit-sint-esse",
                "markdown": "Reprehenderit consequat labore dolor do duis. Quis est ad aute nulla Lorem adipisicing. Cillum reprehenderit dolor aliqua nostrud cupidatat nisi laboris aliquip mollit nulla id quis do cupidatat. Nostrud enim sint in nisi culpa nostrud esse duis reprehenderit non ullamco proident consectetur. Lorem minim tempor labore fugiat sunt ad adipisicing sint exercitation veniam cupidatat mollit.\r\nIpsum proident esse culpa excepteur ea occaecat cillum fugiat irure mollit dolore sunt. Esse aute dolore aliquip nisi exercitation mollit nulla nulla mollit irure eu. Deserunt duis tempor enim ullamco eiusmod consectetur id est consequat sint. Irure laborum magna culpa et sunt sunt et labore do magna cillum consectetur est labore. Ad et ea veniam ea deserunt reprehenderit minim exercitation dolor anim consequat duis ullamco ad. Et proident duis duis ipsum consequat cupidatat adipisicing sint.\r\n",
                "html": "<p>Reprehenderit consequat labore dolor do duis. Quis est ad aute nulla Lorem adipisicing. Cillum reprehenderit dolor aliqua nostrud cupidatat nisi laboris aliquip mollit nulla id quis do cupidatat. Nostrud enim sint in nisi culpa nostrud esse duis reprehenderit non ullamco proident consectetur. Lorem minim tempor labore fugiat sunt ad adipisicing sint exercitation veniam cupidatat mollit.\r\nIpsum proident esse culpa excepteur ea occaecat cillum fugiat irure mollit dolore sunt. Esse aute dolore aliquip nisi exercitation mollit nulla nulla mollit irure eu. Deserunt duis tempor enim ullamco eiusmod consectetur id est consequat sint. Irure laborum magna culpa et sunt sunt et labore do magna cillum consectetur est labore. Ad et ea veniam ea deserunt reprehenderit minim exercitation dolor anim consequat duis ullamco ad. Et proident duis duis ipsum consequat cupidatat adipisicing sint.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 9,
                    "uuid": "ce0967e9-67ec-4b34-bcf2-5b96e5098296",
                    "name": "Lora Bonner",
                    "slug": "lora-bonner",
                    "email": "lorabonner@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "veniam",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-01-05T05:59:49.714 +08:00",
                    "updated_at": "2014-03-29T14:06:30.157 +07:00"
                },
                "created_at": "2012-09-08T01:02:49.136 +07:00",
                "created_by": {
                    "id": 5,
                    "uuid": "ffa2e5b6-046a-42c0-86da-9c768ce9dacf",
                    "name": "Mitzi Wells",
                    "slug": "mitzi-wells",
                    "email": "mitziwells@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolore veniam nostrud",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-04-08T14:05:00.105 +07:00",
                    "updated_at": "2013-12-19T15:03:15.569 +08:00"
                },
                "updated_at": "2012-10-08T07:43:21.711 +07:00",
                "updated_by": {
                    "id": 2,
                    "uuid": "6c3c0fa1-2feb-49ea-a74d-219100d52bbb",
                    "name": "Roberta Padilla",
                    "slug": "roberta-padilla",
                    "email": "robertapadilla@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "nisi",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-20T06:58:44.799 +07:00",
                    "updated_at": "2012-06-06T23:55:52.819 +07:00"
                },
                "published_at": "2013-12-09T12:20:31.241 +08:00",
                "published_by": {
                    "id": 2,
                    "uuid": "b2bfaf60-e8b0-496b-9f99-26fa42a7aae7",
                    "name": "Daisy Small",
                    "slug": "daisy-small",
                    "email": "daisysmall@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "velit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-02-25T12:26:30.010 +08:00",
                    "updated_at": "2014-02-01T18:44:10.927 +08:00"
                },
                "tags": [
                    {
                        "id": 6,
                        "uuid": "aaa33dc6-38ae-4d26-be6a-e63da8535776",
                        "name": "ad et in",
                        "slug": "ad-et-in",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-01-26T12:59:45.356 +08:00",
                        "created_by": 8,
                        "updated_at": "2014-05-23T22:08:32.239 +07:00",
                        "updated_by": 8
                    },
                    {
                        "id": 3,
                        "uuid": "77170a76-d5bd-4e9e-9c4b-b8f79a35acd8",
                        "name": "excepteur et",
                        "slug": "excepteur-et",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-20T21:24:48.050 +07:00",
                        "created_by": 7,
                        "updated_at": "2013-11-01T08:44:19.751 +07:00",
                        "updated_by": 0
                    }
                ]
            },
            {
                "id": 13,
                "uuid": "66344c55-99bd-44f6-8a96-63230f88d048",
                "status": "published",
                "title": "ullamco esse proident irure Lorem proident mollit eu et",
                "slug": "ullamco-esse-proident-irure-Lorem-proident-mollit-eu-et",
                "markdown": "Irure dolore reprehenderit voluptate Lorem consectetur Lorem quis et Lorem. Ea labore culpa anim duis deserunt. Consectetur ipsum tempor veniam irure quis irure adipisicing sit deserunt anim cupidatat aliqua in. Dolore tempor irure non velit irure cupidatat minim. Quis irure minim est sunt. Tempor anim fugiat incididunt anim nostrud enim eu proident. Cupidatat nisi do nisi aliquip est id.\r\nDolor nostrud non ea voluptate irure exercitation ex eiusmod proident id. Qui deserunt magna minim excepteur anim nulla. Minim duis reprehenderit in ad enim aliqua irure ullamco excepteur dolore dolore.\r\nElit aliquip voluptate esse cupidatat excepteur anim officia consequat eiusmod enim ut pariatur minim dolore. Tempor quis culpa reprehenderit laborum adipisicing ea ullamco labore nisi sunt consequat esse ea sit. Lorem deserunt ad consequat qui anim aute consectetur cillum magna laboris. Qui ipsum nulla id commodo labore non. Et tempor ad in consequat excepteur.\r\nNulla officia laborum culpa elit duis adipisicing laboris pariatur exercitation veniam eiusmod. Deserunt et Lorem elit mollit adipisicing non. Cillum commodo aute fugiat eiusmod ea id. Ea proident magna labore minim laborum. Nulla aliqua amet veniam et consequat ad fugiat velit nostrud pariatur est elit proident. Ullamco deserunt tempor laboris qui dolor.\r\nEiusmod voluptate voluptate nisi sint. Eu consequat in deserunt nisi aliqua aute irure id incididunt. Adipisicing irure nisi exercitation eiusmod sint. Laboris ipsum duis et culpa nostrud. Lorem excepteur excepteur mollit labore magna quis elit ad amet culpa id magna sunt.\r\nIncididunt nulla veniam in labore commodo cupidatat consectetur cupidatat minim ullamco nostrud labore. Lorem amet adipisicing commodo fugiat amet enim ut cillum anim duis ad sint cupidatat. Cupidatat quis magna deserunt deserunt ex eiusmod ipsum ea do irure eiusmod id.\r\nDolor sunt fugiat ea ut et ut fugiat dolore occaecat esse. Id proident ut est ea eiusmod est consequat commodo laborum ullamco. Ad ea Lorem irure Lorem officia. Tempor ex quis dolore eiusmod ut dolore enim ad nulla adipisicing consectetur. Irure adipisicing veniam culpa officia fugiat. Lorem eiusmod officia commodo ipsum. Commodo officia officia cupidatat aliqua dolore eiusmod duis pariatur ipsum laborum enim pariatur dolor consequat.\r\nId elit ullamco est deserunt fugiat cillum. Consectetur irure culpa consectetur velit irure officia. Esse officia ipsum enim non. Non in sint excepteur dolor esse proident laborum ipsum culpa veniam.\r\nVelit ex aliqua consequat mollit mollit commodo fugiat anim laborum dolor ea incididunt anim sint. Anim do labore velit adipisicing. Pariatur dolore magna laborum elit enim minim fugiat anim consequat aliqua velit sunt Lorem. In duis occaecat exercitation veniam et nostrud consequat non.\r\nEiusmod nostrud Lorem ipsum amet eu quis mollit aliquip occaecat cupidatat incididunt pariatur ad magna. Excepteur anim Lorem fugiat dolore labore. Ullamco veniam qui aliquip do commodo dolore dolore ut enim culpa. Qui ut ut exercitation laboris do ea laboris labore minim id. Voluptate esse elit in eu pariatur consequat. Laborum aute non sit ex deserunt cillum nostrud. Ut quis excepteur ipsum magna voluptate non elit id fugiat et reprehenderit irure eiusmod.\r\n",
                "html": "<p>Irure dolore reprehenderit voluptate Lorem consectetur Lorem quis et Lorem. Ea labore culpa anim duis deserunt. Consectetur ipsum tempor veniam irure quis irure adipisicing sit deserunt anim cupidatat aliqua in. Dolore tempor irure non velit irure cupidatat minim. Quis irure minim est sunt. Tempor anim fugiat incididunt anim nostrud enim eu proident. Cupidatat nisi do nisi aliquip est id.\r\nDolor nostrud non ea voluptate irure exercitation ex eiusmod proident id. Qui deserunt magna minim excepteur anim nulla. Minim duis reprehenderit in ad enim aliqua irure ullamco excepteur dolore dolore.\r\nElit aliquip voluptate esse cupidatat excepteur anim officia consequat eiusmod enim ut pariatur minim dolore. Tempor quis culpa reprehenderit laborum adipisicing ea ullamco labore nisi sunt consequat esse ea sit. Lorem deserunt ad consequat qui anim aute consectetur cillum magna laboris. Qui ipsum nulla id commodo labore non. Et tempor ad in consequat excepteur.\r\nNulla officia laborum culpa elit duis adipisicing laboris pariatur exercitation veniam eiusmod. Deserunt et Lorem elit mollit adipisicing non. Cillum commodo aute fugiat eiusmod ea id. Ea proident magna labore minim laborum. Nulla aliqua amet veniam et consequat ad fugiat velit nostrud pariatur est elit proident. Ullamco deserunt tempor laboris qui dolor.\r\nEiusmod voluptate voluptate nisi sint. Eu consequat in deserunt nisi aliqua aute irure id incididunt. Adipisicing irure nisi exercitation eiusmod sint. Laboris ipsum duis et culpa nostrud. Lorem excepteur excepteur mollit labore magna quis elit ad amet culpa id magna sunt.\r\nIncididunt nulla veniam in labore commodo cupidatat consectetur cupidatat minim ullamco nostrud labore. Lorem amet adipisicing commodo fugiat amet enim ut cillum anim duis ad sint cupidatat. Cupidatat quis magna deserunt deserunt ex eiusmod ipsum ea do irure eiusmod id.\r\nDolor sunt fugiat ea ut et ut fugiat dolore occaecat esse. Id proident ut est ea eiusmod est consequat commodo laborum ullamco. Ad ea Lorem irure Lorem officia. Tempor ex quis dolore eiusmod ut dolore enim ad nulla adipisicing consectetur. Irure adipisicing veniam culpa officia fugiat. Lorem eiusmod officia commodo ipsum. Commodo officia officia cupidatat aliqua dolore eiusmod duis pariatur ipsum laborum enim pariatur dolor consequat.\r\nId elit ullamco est deserunt fugiat cillum. Consectetur irure culpa consectetur velit irure officia. Esse officia ipsum enim non. Non in sint excepteur dolor esse proident laborum ipsum culpa veniam.\r\nVelit ex aliqua consequat mollit mollit commodo fugiat anim laborum dolor ea incididunt anim sint. Anim do labore velit adipisicing. Pariatur dolore magna laborum elit enim minim fugiat anim consequat aliqua velit sunt Lorem. In duis occaecat exercitation veniam et nostrud consequat non.\r\nEiusmod nostrud Lorem ipsum amet eu quis mollit aliquip occaecat cupidatat incididunt pariatur ad magna. Excepteur anim Lorem fugiat dolore labore. Ullamco veniam qui aliquip do commodo dolore dolore ut enim culpa. Qui ut ut exercitation laboris do ea laboris labore minim id. Voluptate esse elit in eu pariatur consequat. Laborum aute non sit ex deserunt cillum nostrud. Ut quis excepteur ipsum magna voluptate non elit id fugiat et reprehenderit irure eiusmod.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 4,
                    "uuid": "512d9e84-6cf3-445f-aa8a-182a66e17cf4",
                    "name": "Amalia Tillman",
                    "slug": "amalia-tillman",
                    "email": "amaliatillman@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "duis ad",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-10T20:59:55.068 +07:00",
                    "updated_at": "2012-05-19T11:28:41.744 +07:00"
                },
                "created_at": "2014-02-14T10:51:05.003 +08:00",
                "created_by": {
                    "id": 8,
                    "uuid": "4d416b43-72c8-4a9a-b2b7-cd6cf1271774",
                    "name": "Annette Crawford",
                    "slug": "annette-crawford",
                    "email": "annettecrawford@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ipsum in irure",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-25T21:50:15.600 +07:00",
                    "updated_at": "2013-04-23T12:20:20.264 +07:00"
                },
                "updated_at": "2013-12-05T12:28:25.157 +08:00",
                "updated_by": {
                    "id": 7,
                    "uuid": "cc886369-c492-489e-bbd2-d5dc4e44c8b8",
                    "name": "Dotson Dale",
                    "slug": "dotson-dale",
                    "email": "dotsondale@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "aliquip tempor",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-05-03T17:28:52.528 +07:00",
                    "updated_at": "2013-02-01T20:17:34.009 +08:00"
                },
                "published_at": "2014-01-10T07:41:17.920 +08:00",
                "published_by": {
                    "id": 7,
                    "uuid": "25c40c76-fa9b-4ab1-89d2-010f85ac0962",
                    "name": "Deann Huff",
                    "slug": "deann-huff",
                    "email": "deannhuff@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "esse voluptate",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-01-17T15:36:10.114 +08:00",
                    "updated_at": "2012-05-28T00:31:14.311 +07:00"
                },
                "tags": [
                    {
                        "id": 57,
                        "uuid": "06916b35-2614-4c69-9486-ee3e63aac568",
                        "name": "consequat",
                        "slug": "consequat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-05T09:36:11.461 +08:00",
                        "created_by": 2,
                        "updated_at": "2014-01-01T19:41:47.620 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 58,
                        "uuid": "9ecabbee-1273-421c-a94a-31703cf96e29",
                        "name": "anim in",
                        "slug": "anim-in",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-03-09T11:34:04.369 +08:00",
                        "created_by": 0,
                        "updated_at": "2012-08-17T04:35:57.916 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 16,
                        "uuid": "a63dde9d-0118-49af-a68c-a63ab8f9712d",
                        "name": "nulla",
                        "slug": "nulla",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-06T02:18:36.155 +07:00",
                        "created_by": 5,
                        "updated_at": "2012-08-26T00:46:06.563 +07:00",
                        "updated_by": 2
                    },
                    {
                        "id": 85,
                        "uuid": "ea2b9c93-4b83-46ef-972c-38f9d668499f",
                        "name": "duis",
                        "slug": "duis",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-16T12:27:50.434 +08:00",
                        "created_by": 0,
                        "updated_at": "2012-09-21T02:28:50.284 +07:00",
                        "updated_by": 2
                    }
                ]
            },
            {
                "id": 14,
                "uuid": "3eacca71-b229-4b4a-b50a-70ac77104e4d",
                "status": "published",
                "title": "consequat commodo veniam occaecat elit sit laboris ex",
                "slug": "consequat-commodo-veniam-occaecat-elit-sit-laboris-ex",
                "markdown": "Sint voluptate cillum deserunt sunt. Deserunt occaecat adipisicing velit commodo ullamco ad ad. Elit mollit proident consequat nulla incididunt deserunt duis pariatur in excepteur. Voluptate sit veniam Lorem ipsum.\r\nEx ut anim laboris enim velit ullamco dolor culpa nisi aute adipisicing proident adipisicing. Fugiat eu minim ex reprehenderit. Officia consequat anim ullamco aute consectetur dolor. Eu adipisicing laboris qui in consectetur irure pariatur ex. Proident id tempor excepteur proident. Nulla Lorem elit laboris magna cillum adipisicing. Amet voluptate sint velit sit occaecat ex reprehenderit proident quis anim consequat nisi.\r\nLabore deserunt occaecat pariatur labore nisi adipisicing enim. Nisi sunt sunt ex non dolore fugiat Lorem minim occaecat dolore sint aliqua. Non culpa laborum ex magna culpa sunt proident consectetur occaecat consectetur mollit commodo. Velit consequat deserunt ipsum ipsum sit. Cillum ut consequat id adipisicing proident.\r\nExercitation ut consectetur eu velit veniam ullamco elit Lorem dolor. Exercitation enim esse sunt fugiat esse eu veniam Lorem aute sunt elit pariatur nisi id. Tempor sint eiusmod non do aute commodo sint Lorem. Qui cillum duis dolore Lorem aliqua aliqua mollit aute ullamco Lorem.\r\n",
                "html": "<p>Sint voluptate cillum deserunt sunt. Deserunt occaecat adipisicing velit commodo ullamco ad ad. Elit mollit proident consequat nulla incididunt deserunt duis pariatur in excepteur. Voluptate sit veniam Lorem ipsum.\r\nEx ut anim laboris enim velit ullamco dolor culpa nisi aute adipisicing proident adipisicing. Fugiat eu minim ex reprehenderit. Officia consequat anim ullamco aute consectetur dolor. Eu adipisicing laboris qui in consectetur irure pariatur ex. Proident id tempor excepteur proident. Nulla Lorem elit laboris magna cillum adipisicing. Amet voluptate sint velit sit occaecat ex reprehenderit proident quis anim consequat nisi.\r\nLabore deserunt occaecat pariatur labore nisi adipisicing enim. Nisi sunt sunt ex non dolore fugiat Lorem minim occaecat dolore sint aliqua. Non culpa laborum ex magna culpa sunt proident consectetur occaecat consectetur mollit commodo. Velit consequat deserunt ipsum ipsum sit. Cillum ut consequat id adipisicing proident.\r\nExercitation ut consectetur eu velit veniam ullamco elit Lorem dolor. Exercitation enim esse sunt fugiat esse eu veniam Lorem aute sunt elit pariatur nisi id. Tempor sint eiusmod non do aute commodo sint Lorem. Qui cillum duis dolore Lorem aliqua aliqua mollit aute ullamco Lorem.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 2,
                    "uuid": "029ab1f9-933b-47dd-ba87-705aba0790e0",
                    "name": "Hester Becker",
                    "slug": "hester-becker",
                    "email": "hesterbecker@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "irure labore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-02-20T20:44:56.459 +08:00",
                    "updated_at": "2014-04-16T14:35:39.171 +07:00"
                },
                "created_at": "2012-07-16T16:36:06.654 +07:00",
                "created_by": {
                    "id": 5,
                    "uuid": "fc4b8867-7051-4ca8-b4b8-b2ff0342dbc9",
                    "name": "Browning Hernandez",
                    "slug": "browning-hernandez",
                    "email": "browninghernandez@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "irure duis dolore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-04-14T01:54:27.689 +07:00",
                    "updated_at": "2013-05-14T09:51:26.985 +07:00"
                },
                "updated_at": "2012-12-25T10:35:14.120 +08:00",
                "updated_by": {
                    "id": 4,
                    "uuid": "bf19939d-7267-4a60-9d91-2e38f95e9227",
                    "name": "Noelle Wall",
                    "slug": "noelle-wall",
                    "email": "noellewall@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "excepteur quis",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-09-12T00:57:26.639 +07:00",
                    "updated_at": "2013-12-29T02:34:23.942 +08:00"
                },
                "published_at": "2013-03-12T07:46:36.883 +07:00",
                "published_by": {
                    "id": 3,
                    "uuid": "9c88701e-4f19-4a43-b4b2-7ab7da53c6e8",
                    "name": "Jeannette Kim",
                    "slug": "jeannette-kim",
                    "email": "jeannettekim@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "labore nostrud mollit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-02-29T10:33:15.859 +08:00",
                    "updated_at": "2012-03-02T05:33:25.009 +08:00"
                },
                "tags": [
                    {
                        "id": 88,
                        "uuid": "2ffb90b5-9836-449b-bbee-00ce8b4f5d60",
                        "name": "commodo qui",
                        "slug": "commodo-qui",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-02-07T19:52:54.753 +08:00",
                        "created_by": 1,
                        "updated_at": "2012-02-19T19:11:46.954 +08:00",
                        "updated_by": 6
                    },
                    {
                        "id": 99,
                        "uuid": "bd152a3d-2058-472e-8258-576b8873d311",
                        "name": "aute incididunt",
                        "slug": "aute-incididunt",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-02-28T15:17:38.978 +08:00",
                        "created_by": 7,
                        "updated_at": "2012-12-13T16:06:23.453 +08:00",
                        "updated_by": 5
                    },
                    {
                        "id": 37,
                        "uuid": "a0f1db60-6569-4249-8f4e-89e14d00bbf9",
                        "name": "nulla nostrud ea",
                        "slug": "nulla-nostrud-ea",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-10-04T19:06:43.185 +07:00",
                        "created_by": 3,
                        "updated_at": "2012-06-23T15:38:16.706 +07:00",
                        "updated_by": 8
                    },
                    {
                        "id": 86,
                        "uuid": "89663d1d-ff5a-4283-a081-c566191430dd",
                        "name": "excepteur in",
                        "slug": "excepteur-in",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-09-06T16:04:07.777 +07:00",
                        "created_by": 1,
                        "updated_at": "2012-12-26T13:27:26.896 +08:00",
                        "updated_by": 7
                    },
                    {
                        "id": 2,
                        "uuid": "be158286-2bb6-4a33-9965-52ab31a5c111",
                        "name": "voluptate irure mollit",
                        "slug": "voluptate-irure-mollit",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-04-27T15:22:47.701 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-05-06T00:18:28.614 +07:00",
                        "updated_by": 10
                    }
                ]
            },
            {
                "id": 15,
                "uuid": "b4c3efda-0c9b-4589-ad27-41e9d883f7ff",
                "status": "published",
                "title": "excepteur tempor est anim id minim est aliqua",
                "slug": "excepteur-tempor-est-anim-id-minim-est-aliqua",
                "markdown": "Cupidatat in adipisicing aliqua adipisicing ex. Commodo laboris veniam eiusmod incididunt tempor laborum. Ipsum in excepteur reprehenderit veniam aliqua fugiat. Exercitation nulla id est ea est minim reprehenderit ea. Exercitation amet occaecat est labore.\r\nIncididunt aute ullamco laborum laboris labore. Consequat veniam et est sit nostrud aute do velit veniam. Dolore laboris et in eiusmod adipisicing amet est irure cillum nostrud laboris sit. Aliqua cupidatat aliqua sint commodo dolore. Ex culpa ullamco cillum voluptate ad ullamco id ex id culpa. Labore quis sit consequat elit ea cillum commodo enim nostrud deserunt excepteur mollit. Ipsum irure cupidatat culpa aliquip.\r\nEiusmod officia in incididunt sint voluptate excepteur ut. Eu id sint officia mollit est nostrud fugiat aute tempor magna ipsum magna aliqua. Ad elit deserunt elit elit laboris quis ex amet ipsum laborum id fugiat cupidatat. Mollit labore est eu eiusmod nostrud cupidatat officia duis. Nostrud et duis occaecat ipsum exercitation ut deserunt. Dolor ad magna ipsum veniam in quis enim et veniam quis.\r\nEx laborum ex nisi ad sit est incididunt. Sunt non aliquip fugiat eu. Consectetur deserunt aliquip fugiat consequat.\r\nCommodo mollit sint tempor adipisicing reprehenderit ea deserunt commodo. Non veniam elit laboris velit do consectetur amet amet anim eu. Do dolore irure Lorem est adipisicing anim mollit. Sit fugiat consequat cillum non ex minim.\r\nId exercitation in ea sunt quis ipsum laborum excepteur. Consectetur cupidatat eiusmod commodo voluptate laboris exercitation exercitation nostrud. Consequat sint duis nisi sit culpa Lorem ullamco reprehenderit ut dolore aliquip quis aliquip in. Commodo nisi anim irure voluptate consectetur irure reprehenderit quis. Enim adipisicing exercitation tempor pariatur mollit culpa amet amet consectetur proident ipsum culpa. Occaecat quis exercitation esse consequat dolor tempor cupidatat. Eu ea laboris commodo ex ullamco ea.\r\n",
                "html": "<p>Cupidatat in adipisicing aliqua adipisicing ex. Commodo laboris veniam eiusmod incididunt tempor laborum. Ipsum in excepteur reprehenderit veniam aliqua fugiat. Exercitation nulla id est ea est minim reprehenderit ea. Exercitation amet occaecat est labore.\r\nIncididunt aute ullamco laborum laboris labore. Consequat veniam et est sit nostrud aute do velit veniam. Dolore laboris et in eiusmod adipisicing amet est irure cillum nostrud laboris sit. Aliqua cupidatat aliqua sint commodo dolore. Ex culpa ullamco cillum voluptate ad ullamco id ex id culpa. Labore quis sit consequat elit ea cillum commodo enim nostrud deserunt excepteur mollit. Ipsum irure cupidatat culpa aliquip.\r\nEiusmod officia in incididunt sint voluptate excepteur ut. Eu id sint officia mollit est nostrud fugiat aute tempor magna ipsum magna aliqua. Ad elit deserunt elit elit laboris quis ex amet ipsum laborum id fugiat cupidatat. Mollit labore est eu eiusmod nostrud cupidatat officia duis. Nostrud et duis occaecat ipsum exercitation ut deserunt. Dolor ad magna ipsum veniam in quis enim et veniam quis.\r\nEx laborum ex nisi ad sit est incididunt. Sunt non aliquip fugiat eu. Consectetur deserunt aliquip fugiat consequat.\r\nCommodo mollit sint tempor adipisicing reprehenderit ea deserunt commodo. Non veniam elit laboris velit do consectetur amet amet anim eu. Do dolore irure Lorem est adipisicing anim mollit. Sit fugiat consequat cillum non ex minim.\r\nId exercitation in ea sunt quis ipsum laborum excepteur. Consectetur cupidatat eiusmod commodo voluptate laboris exercitation exercitation nostrud. Consequat sint duis nisi sit culpa Lorem ullamco reprehenderit ut dolore aliquip quis aliquip in. Commodo nisi anim irure voluptate consectetur irure reprehenderit quis. Enim adipisicing exercitation tempor pariatur mollit culpa amet amet consectetur proident ipsum culpa. Occaecat quis exercitation esse consequat dolor tempor cupidatat. Eu ea laboris commodo ex ullamco ea.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 10,
                    "uuid": "455d0624-688c-4892-8959-c0eb7b53930c",
                    "name": "Martina Wilson",
                    "slug": "martina-wilson",
                    "email": "martinawilson@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "excepteur",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-05-06T23:17:34.927 +07:00",
                    "updated_at": "2012-03-13T01:40:13.492 +07:00"
                },
                "created_at": "2012-08-04T21:59:57.794 +07:00",
                "created_by": {
                    "id": 1,
                    "uuid": "aee570a6-7d02-4d53-a50b-21ad25d59bba",
                    "name": "Nell Velez",
                    "slug": "nell-velez",
                    "email": "nellvelez@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "sint nisi",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-02-24T08:46:59.687 +08:00",
                    "updated_at": "2012-04-13T08:09:25.498 +07:00"
                },
                "updated_at": "2013-08-10T07:23:48.670 +07:00",
                "updated_by": {
                    "id": 2,
                    "uuid": "72f2a8b3-ad30-494a-b9db-c89d4ca59014",
                    "name": "Zelma Branch",
                    "slug": "zelma-branch",
                    "email": "zelmabranch@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "exercitation ut reprehenderit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-03-08T13:17:50.521 +08:00",
                    "updated_at": "2014-03-16T08:48:29.975 +07:00"
                },
                "published_at": "2014-05-18T03:55:22.171 +07:00",
                "published_by": {
                    "id": 7,
                    "uuid": "ba3b1f60-5c4e-42c3-a1e8-3b6586f45c16",
                    "name": "Dunlap Cooke",
                    "slug": "dunlap-cooke",
                    "email": "dunlapcooke@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "consequat pariatur culpa",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-11-08T02:49:52.627 +08:00",
                    "updated_at": "2012-09-20T15:20:30.326 +07:00"
                },
                "tags": [
                    {
                        "id": 35,
                        "uuid": "b90b3b81-6292-49a2-9397-bf1fe834bd85",
                        "name": "laborum minim",
                        "slug": "laborum-minim",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-05-03T13:33:16.722 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-03-17T10:05:26.098 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 24,
                        "uuid": "cd8bc8d9-164e-4efa-a795-1f02523a284d",
                        "name": "officia",
                        "slug": "officia",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-08T08:44:23.869 +08:00",
                        "created_by": 5,
                        "updated_at": "2012-08-21T12:55:06.822 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 58,
                        "uuid": "3f13605c-f22e-4d4a-9780-4934aee8e7e6",
                        "name": "consectetur amet qui",
                        "slug": "consectetur-amet-qui",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-06-23T23:13:03.822 +07:00",
                        "created_by": 6,
                        "updated_at": "2013-04-28T21:14:42.739 +07:00",
                        "updated_by": 1
                    },
                    {
                        "id": 98,
                        "uuid": "7c2fce67-47c9-4937-8859-9175eb203a61",
                        "name": "eiusmod",
                        "slug": "eiusmod",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-06-06T09:10:12.195 +07:00",
                        "created_by": 5,
                        "updated_at": "2013-10-25T20:13:41.399 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 25,
                        "uuid": "128e5d36-1ce1-4c38-9b3b-696675226a0b",
                        "name": "labore ullamco",
                        "slug": "labore-ullamco",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-10-20T08:31:24.209 +07:00",
                        "created_by": 7,
                        "updated_at": "2012-12-04T11:41:27.890 +08:00",
                        "updated_by": 7
                    }
                ]
            },
            {
                "id": 16,
                "uuid": "68a968be-27ad-40db-afb1-bf4ea56182d7",
                "status": "draft",
                "title": "veniam eu",
                "slug": "veniam-eu",
                "markdown": "Non reprehenderit officia quis nulla exercitation cupidatat deserunt sunt tempor Lorem tempor ea in exercitation. Commodo Lorem proident adipisicing aliquip. Anim aliquip consequat elit culpa excepteur. Sint non tempor labore incididunt aliqua incididunt consectetur minim laboris deserunt. Commodo in aute dolor anim incididunt excepteur excepteur dolore.\r\nNon amet incididunt irure nulla nisi reprehenderit quis anim nulla ex elit do. Proident mollit ea mollit duis aliquip. Consectetur fugiat magna eiusmod officia velit irure et do. Sit occaecat excepteur commodo sint qui pariatur nostrud duis sit. Ad nulla ea commodo enim. Incididunt enim aute excepteur ullamco pariatur.\r\nSunt veniam id nulla dolor fugiat officia adipisicing. Esse duis esse nulla veniam tempor ad proident do magna id. Veniam enim sunt et enim sint excepteur ad sunt deserunt ea sit enim nulla. Id consectetur aute cupidatat incididunt ex aute id elit sit deserunt elit id. Eiusmod veniam mollit ea Lorem nostrud labore nulla ea aliquip eiusmod magna. Occaecat ullamco qui amet eu eu.\r\nOfficia do excepteur incididunt sunt. Anim veniam amet ullamco cillum laborum veniam proident duis aliquip magna. Adipisicing mollit veniam irure sint ea ut nostrud velit. Amet consequat ad quis est ipsum amet aute. In non ipsum consectetur mollit culpa do incididunt adipisicing anim nulla culpa.\r\nNisi ut reprehenderit nostrud consectetur officia minim dolor anim Lorem sint excepteur eiusmod excepteur laborum. Nulla aute nostrud laborum sit aliqua pariatur aliqua consectetur non esse ex. Ex tempor voluptate commodo labore elit ullamco dolor veniam laboris deserunt. Amet officia magna ad voluptate exercitation enim est veniam commodo est nostrud. Fugiat aliquip sunt quis incididunt. Enim eu excepteur quis ipsum aliqua dolore.\r\nIn ea eiusmod cillum fugiat eu et qui veniam veniam minim ut non magna. Adipisicing tempor commodo do ipsum fugiat commodo. Minim consectetur mollit ullamco aliquip id commodo est velit velit excepteur deserunt aute. Dolore exercitation minim cillum aute. Elit officia quis cupidatat irure dolore ut aliquip fugiat ea irure. Anim labore minim eu consectetur Lorem esse ex officia cupidatat pariatur eu eiusmod.\r\nNulla anim anim eiusmod adipisicing incididunt dolore exercitation tempor elit laborum deserunt. Id veniam laborum tempor amet id in laboris occaecat magna exercitation nisi. Quis eu qui dolor aliquip. Aute consectetur consequat officia veniam nisi. Exercitation eu sint fugiat magna labore consectetur amet fugiat commodo fugiat ipsum dolore voluptate. Laboris exercitation Lorem do magna laborum do excepteur consequat cillum sint.\r\n",
                "html": "<p>Non reprehenderit officia quis nulla exercitation cupidatat deserunt sunt tempor Lorem tempor ea in exercitation. Commodo Lorem proident adipisicing aliquip. Anim aliquip consequat elit culpa excepteur. Sint non tempor labore incididunt aliqua incididunt consectetur minim laboris deserunt. Commodo in aute dolor anim incididunt excepteur excepteur dolore.\r\nNon amet incididunt irure nulla nisi reprehenderit quis anim nulla ex elit do. Proident mollit ea mollit duis aliquip. Consectetur fugiat magna eiusmod officia velit irure et do. Sit occaecat excepteur commodo sint qui pariatur nostrud duis sit. Ad nulla ea commodo enim. Incididunt enim aute excepteur ullamco pariatur.\r\nSunt veniam id nulla dolor fugiat officia adipisicing. Esse duis esse nulla veniam tempor ad proident do magna id. Veniam enim sunt et enim sint excepteur ad sunt deserunt ea sit enim nulla. Id consectetur aute cupidatat incididunt ex aute id elit sit deserunt elit id. Eiusmod veniam mollit ea Lorem nostrud labore nulla ea aliquip eiusmod magna. Occaecat ullamco qui amet eu eu.\r\nOfficia do excepteur incididunt sunt. Anim veniam amet ullamco cillum laborum veniam proident duis aliquip magna. Adipisicing mollit veniam irure sint ea ut nostrud velit. Amet consequat ad quis est ipsum amet aute. In non ipsum consectetur mollit culpa do incididunt adipisicing anim nulla culpa.\r\nNisi ut reprehenderit nostrud consectetur officia minim dolor anim Lorem sint excepteur eiusmod excepteur laborum. Nulla aute nostrud laborum sit aliqua pariatur aliqua consectetur non esse ex. Ex tempor voluptate commodo labore elit ullamco dolor veniam laboris deserunt. Amet officia magna ad voluptate exercitation enim est veniam commodo est nostrud. Fugiat aliquip sunt quis incididunt. Enim eu excepteur quis ipsum aliqua dolore.\r\nIn ea eiusmod cillum fugiat eu et qui veniam veniam minim ut non magna. Adipisicing tempor commodo do ipsum fugiat commodo. Minim consectetur mollit ullamco aliquip id commodo est velit velit excepteur deserunt aute. Dolore exercitation minim cillum aute. Elit officia quis cupidatat irure dolore ut aliquip fugiat ea irure. Anim labore minim eu consectetur Lorem esse ex officia cupidatat pariatur eu eiusmod.\r\nNulla anim anim eiusmod adipisicing incididunt dolore exercitation tempor elit laborum deserunt. Id veniam laborum tempor amet id in laboris occaecat magna exercitation nisi. Quis eu qui dolor aliquip. Aute consectetur consequat officia veniam nisi. Exercitation eu sint fugiat magna labore consectetur amet fugiat commodo fugiat ipsum dolore voluptate. Laboris exercitation Lorem do magna laborum do excepteur consequat cillum sint.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 7,
                    "uuid": "7cab4220-b625-4917-978b-73f50edd5301",
                    "name": "Delacruz Rosario",
                    "slug": "delacruz-rosario",
                    "email": "delacruzrosario@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "id commodo",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-09-27T03:58:41.260 +07:00",
                    "updated_at": "2013-12-26T05:14:20.304 +08:00"
                },
                "created_at": "2014-05-23T13:32:04.022 +07:00",
                "created_by": {
                    "id": 6,
                    "uuid": "0a30bb5c-751f-4b5f-85f7-4c782a7f182a",
                    "name": "Maricela Pierce",
                    "slug": "maricela-pierce",
                    "email": "maricelapierce@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ad et",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-05-24T16:44:16.316 +07:00",
                    "updated_at": "2014-01-05T23:06:51.301 +08:00"
                },
                "updated_at": "2013-08-27T06:12:41.337 +07:00",
                "updated_by": {
                    "id": 8,
                    "uuid": "1f77e538-d14a-4baf-82f3-bea867ac63ba",
                    "name": "Lourdes Powell",
                    "slug": "lourdes-powell",
                    "email": "lourdespowell@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "officia",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-02-25T16:27:50.072 +08:00",
                    "updated_at": "2013-10-14T18:31:24.373 +07:00"
                },
                "published_at": "2012-11-10T07:15:10.312 +08:00",
                "published_by": {
                    "id": 2,
                    "uuid": "67265149-1fb1-4bf9-b0bc-84c2bac143f4",
                    "name": "Manuela Mcintosh",
                    "slug": "manuela-mcintosh",
                    "email": "manuelamcintosh@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolor veniam cillum",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-07-05T05:12:21.143 +07:00",
                    "updated_at": "2013-02-08T08:17:22.279 +08:00"
                },
                "tags": [
                    {
                        "id": 70,
                        "uuid": "3b9bd26c-d733-427d-aa0c-6e1fa9416d35",
                        "name": "labore",
                        "slug": "labore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-12-07T11:02:08.397 +08:00",
                        "created_by": 5,
                        "updated_at": "2013-07-08T19:51:29.152 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 53,
                        "uuid": "33c38fcc-b0e0-40ab-bf0f-e16e47e2cb73",
                        "name": "id",
                        "slug": "id",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-02-21T02:21:48.122 +08:00",
                        "created_by": 10,
                        "updated_at": "2013-03-28T20:00:45.168 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 18,
                        "uuid": "19b0f617-8175-4446-9cee-2e127bd87127",
                        "name": "irure",
                        "slug": "irure",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-11-01T02:36:09.383 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-02-09T07:28:58.815 +08:00",
                        "updated_by": 9
                    },
                    {
                        "id": 80,
                        "uuid": "2fa3e5ae-046a-4243-a0f6-e77f3983e363",
                        "name": "irure",
                        "slug": "irure",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-03-16T07:45:36.991 +07:00",
                        "created_by": 8,
                        "updated_at": "2012-03-09T09:22:03.175 +08:00",
                        "updated_by": 2
                    },
                    {
                        "id": 31,
                        "uuid": "70fecb1c-b932-4676-aab5-ab289820a060",
                        "name": "tempor",
                        "slug": "tempor",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-12-19T14:12:02.597 +08:00",
                        "created_by": 9,
                        "updated_at": "2013-02-10T19:25:38.447 +08:00",
                        "updated_by": 3
                    },
                    {
                        "id": 99,
                        "uuid": "9c0c2248-2e56-4cad-81ac-0fc2e142f697",
                        "name": "veniam enim reprehenderit",
                        "slug": "veniam-enim-reprehenderit",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-07-16T15:12:01.884 +07:00",
                        "created_by": 3,
                        "updated_at": "2013-04-16T20:39:20.176 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 40,
                        "uuid": "502b56b7-8b90-4d98-9080-7b11823e385a",
                        "name": "qui",
                        "slug": "qui",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-08-19T03:46:11.200 +07:00",
                        "created_by": 2,
                        "updated_at": "2012-11-10T15:54:40.277 +08:00",
                        "updated_by": 6
                    },
                    {
                        "id": 4,
                        "uuid": "f335a545-45c0-4616-ba63-b77e47ae92f3",
                        "name": "ex elit",
                        "slug": "ex-elit",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-06-19T00:50:11.625 +07:00",
                        "created_by": 3,
                        "updated_at": "2013-07-10T03:34:05.923 +07:00",
                        "updated_by": 2
                    }
                ]
            },
            {
                "id": 17,
                "uuid": "f200cbca-92c8-4fdc-8767-c604bd10404e",
                "status": "published",
                "title": "officia sunt magna Lorem et exercitation laboris fugiat labore",
                "slug": "officia-sunt-magna-Lorem-et-exercitation-laboris-fugiat-labore",
                "markdown": "Pariatur anim elit ex ut dolore pariatur consectetur qui sunt ad. Occaecat magna id elit consequat laboris officia do. Ut culpa eu ipsum sint irure eiusmod excepteur ullamco et excepteur fugiat culpa. Esse ex excepteur pariatur nostrud enim anim aliqua. Ad mollit ut sunt deserunt. Sunt pariatur aliqua laborum aute ut incididunt exercitation. Eiusmod minim velit pariatur reprehenderit culpa.\r\nIrure quis culpa quis excepteur. Amet non laborum veniam elit exercitation est deserunt non pariatur Lorem. Lorem id adipisicing veniam anim mollit eiusmod irure veniam aliquip eiusmod mollit.\r\nEiusmod adipisicing et quis esse incididunt ad. Nulla esse eiusmod id labore enim laborum ut. Culpa qui est sint laboris amet qui duis. Reprehenderit sunt officia amet mollit sit. Incididunt quis velit fugiat qui ut veniam minim ex aliquip veniam id voluptate.\r\nSint Lorem ad esse aute veniam sit quis Lorem adipisicing reprehenderit velit. Ex enim ex sint excepteur non ex aliqua Lorem labore sunt. Ut id sunt velit consequat labore veniam reprehenderit veniam magna. Amet reprehenderit minim esse incididunt laboris excepteur qui eu. Sit exercitation tempor minim esse culpa voluptate. Do irure duis ut enim enim voluptate magna pariatur dolore. Irure nisi pariatur voluptate sit enim mollit veniam.\r\nSunt elit et veniam enim eu irure nisi dolor pariatur dolore irure Lorem Lorem. Et nisi veniam eiusmod laboris velit aliquip amet cupidatat ad aliqua nisi culpa officia. Aliqua excepteur ex duis exercitation dolor incididunt. Sit sint cillum ut consequat aliquip est ea tempor. Culpa eiusmod eu dolor adipisicing occaecat nisi ut.\r\nIpsum sint Lorem ipsum in proident excepteur mollit cillum laborum. Voluptate in ea voluptate velit eiusmod veniam labore esse non cupidatat laborum Lorem eiusmod. Aute deserunt labore cupidatat exercitation sint labore ea enim ut in laboris sint nulla. Anim reprehenderit aliqua laborum qui laborum qui irure consectetur. Nisi ad voluptate reprehenderit sint cillum consequat reprehenderit exercitation cupidatat. Nisi deserunt sint fugiat reprehenderit. Id quis in excepteur consequat aliquip pariatur exercitation pariatur cillum incididunt culpa fugiat.\r\nEsse magna velit velit irure excepteur proident excepteur elit deserunt anim cillum exercitation exercitation. Culpa proident aliquip fugiat occaecat exercitation labore officia labore officia labore. Ex aliqua qui laboris occaecat aute officia ea nostrud magna fugiat aliquip est ipsum est.\r\nProident voluptate commodo officia dolore exercitation amet culpa ea non amet ipsum. Ipsum in sit non culpa occaecat cupidatat ad occaecat proident sunt excepteur ad dolor tempor. Exercitation pariatur excepteur ullamco labore minim veniam labore nisi elit irure ea. Occaecat id exercitation voluptate do et deserunt aliquip id. Ullamco cupidatat deserunt ex mollit sint occaecat ullamco anim enim non ea sunt nisi. In ut ex officia elit.\r\n",
                "html": "<p>Pariatur anim elit ex ut dolore pariatur consectetur qui sunt ad. Occaecat magna id elit consequat laboris officia do. Ut culpa eu ipsum sint irure eiusmod excepteur ullamco et excepteur fugiat culpa. Esse ex excepteur pariatur nostrud enim anim aliqua. Ad mollit ut sunt deserunt. Sunt pariatur aliqua laborum aute ut incididunt exercitation. Eiusmod minim velit pariatur reprehenderit culpa.\r\nIrure quis culpa quis excepteur. Amet non laborum veniam elit exercitation est deserunt non pariatur Lorem. Lorem id adipisicing veniam anim mollit eiusmod irure veniam aliquip eiusmod mollit.\r\nEiusmod adipisicing et quis esse incididunt ad. Nulla esse eiusmod id labore enim laborum ut. Culpa qui est sint laboris amet qui duis. Reprehenderit sunt officia amet mollit sit. Incididunt quis velit fugiat qui ut veniam minim ex aliquip veniam id voluptate.\r\nSint Lorem ad esse aute veniam sit quis Lorem adipisicing reprehenderit velit. Ex enim ex sint excepteur non ex aliqua Lorem labore sunt. Ut id sunt velit consequat labore veniam reprehenderit veniam magna. Amet reprehenderit minim esse incididunt laboris excepteur qui eu. Sit exercitation tempor minim esse culpa voluptate. Do irure duis ut enim enim voluptate magna pariatur dolore. Irure nisi pariatur voluptate sit enim mollit veniam.\r\nSunt elit et veniam enim eu irure nisi dolor pariatur dolore irure Lorem Lorem. Et nisi veniam eiusmod laboris velit aliquip amet cupidatat ad aliqua nisi culpa officia. Aliqua excepteur ex duis exercitation dolor incididunt. Sit sint cillum ut consequat aliquip est ea tempor. Culpa eiusmod eu dolor adipisicing occaecat nisi ut.\r\nIpsum sint Lorem ipsum in proident excepteur mollit cillum laborum. Voluptate in ea voluptate velit eiusmod veniam labore esse non cupidatat laborum Lorem eiusmod. Aute deserunt labore cupidatat exercitation sint labore ea enim ut in laboris sint nulla. Anim reprehenderit aliqua laborum qui laborum qui irure consectetur. Nisi ad voluptate reprehenderit sint cillum consequat reprehenderit exercitation cupidatat. Nisi deserunt sint fugiat reprehenderit. Id quis in excepteur consequat aliquip pariatur exercitation pariatur cillum incididunt culpa fugiat.\r\nEsse magna velit velit irure excepteur proident excepteur elit deserunt anim cillum exercitation exercitation. Culpa proident aliquip fugiat occaecat exercitation labore officia labore officia labore. Ex aliqua qui laboris occaecat aute officia ea nostrud magna fugiat aliquip est ipsum est.\r\nProident voluptate commodo officia dolore exercitation amet culpa ea non amet ipsum. Ipsum in sit non culpa occaecat cupidatat ad occaecat proident sunt excepteur ad dolor tempor. Exercitation pariatur excepteur ullamco labore minim veniam labore nisi elit irure ea. Occaecat id exercitation voluptate do et deserunt aliquip id. Ullamco cupidatat deserunt ex mollit sint occaecat ullamco anim enim non ea sunt nisi. In ut ex officia elit.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 9,
                    "uuid": "d8c3d72a-b300-43af-a916-7be8bc71f153",
                    "name": "Lakisha French",
                    "slug": "lakisha-french",
                    "email": "lakishafrench@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "occaecat ut excepteur",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-04-29T23:02:16.179 +07:00",
                    "updated_at": "2014-03-09T05:48:41.816 +07:00"
                },
                "created_at": "2012-04-12T19:59:40.001 +07:00",
                "created_by": {
                    "id": 4,
                    "uuid": "30d3bae8-c236-4f79-be27-38a8b9281dc3",
                    "name": "Erma Robertson",
                    "slug": "erma-robertson",
                    "email": "ermarobertson@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolor sint in",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-03-24T18:58:53.038 +07:00",
                    "updated_at": "2012-10-16T17:25:43.095 +07:00"
                },
                "updated_at": "2013-12-04T03:44:28.339 +08:00",
                "updated_by": {
                    "id": 2,
                    "uuid": "1231561c-8bd9-495a-98fc-51f27e6e7584",
                    "name": "Buckley Mcbride",
                    "slug": "buckley-mcbride",
                    "email": "buckleymcbride@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "tempor ad",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-11-01T03:43:39.152 +07:00",
                    "updated_at": "2012-11-22T06:10:01.084 +08:00"
                },
                "published_at": "2012-01-13T16:33:01.839 +08:00",
                "published_by": {
                    "id": 3,
                    "uuid": "d94fcd38-9557-46b4-9506-dc8ae2c91c9f",
                    "name": "Lillian Buck",
                    "slug": "lillian-buck",
                    "email": "lillianbuck@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "est",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-01-12T03:31:10.976 +08:00",
                    "updated_at": "2014-01-10T04:25:11.068 +08:00"
                },
                "tags": [
                    {
                        "id": 82,
                        "uuid": "4f8a87ec-2ec8-4fea-a42a-31f8e0f7532c",
                        "name": "nostrud laboris eu",
                        "slug": "nostrud-laboris-eu",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-01-26T15:15:47.818 +08:00",
                        "created_by": 8,
                        "updated_at": "2013-11-30T16:59:15.999 +08:00",
                        "updated_by": 0
                    },
                    {
                        "id": 33,
                        "uuid": "3a36b12e-33ce-494a-a89e-d387595a07d3",
                        "name": "esse aliquip",
                        "slug": "esse-aliquip",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-11T03:41:18.890 +07:00",
                        "created_by": 10,
                        "updated_at": "2012-09-05T09:39:27.030 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 96,
                        "uuid": "e2dd6920-6bf3-4bac-b0c2-73fb08e6a294",
                        "name": "culpa exercitation occaecat",
                        "slug": "culpa-exercitation-occaecat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-03-10T06:24:02.192 +07:00",
                        "created_by": 8,
                        "updated_at": "2013-10-17T15:36:18.268 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 10,
                        "uuid": "04c99cf2-38ab-4f0b-b0c1-4b4d84645ede",
                        "name": "mollit in",
                        "slug": "mollit-in",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-10-28T05:04:20.614 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-12-02T20:28:13.933 +08:00",
                        "updated_by": 8
                    },
                    {
                        "id": 23,
                        "uuid": "78217931-8a75-411e-b87b-da0bebbebe21",
                        "name": "aliquip",
                        "slug": "aliquip",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-15T07:28:11.434 +07:00",
                        "created_by": 0,
                        "updated_at": "2014-03-06T16:44:14.553 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 8,
                        "uuid": "b63d64e4-d1e8-4e7b-a500-2c41619d812b",
                        "name": "adipisicing aliqua",
                        "slug": "adipisicing-aliqua",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-25T22:21:00.224 +08:00",
                        "created_by": 6,
                        "updated_at": "2013-05-29T16:51:28.249 +07:00",
                        "updated_by": 2
                    },
                    {
                        "id": 80,
                        "uuid": "63efde40-d25d-4af8-856a-f88cacc19304",
                        "name": "eu",
                        "slug": "eu",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-05-14T14:47:21.037 +07:00",
                        "created_by": 3,
                        "updated_at": "2012-02-02T09:05:37.582 +08:00",
                        "updated_by": 5
                    },
                    {
                        "id": 56,
                        "uuid": "78aa9e64-495f-4d8f-96ff-e70f576aca7a",
                        "name": "consequat proident exercitation",
                        "slug": "consequat-proident-exercitation",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-06-05T21:37:09.852 +07:00",
                        "created_by": 10,
                        "updated_at": "2012-10-22T10:54:06.490 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 4,
                        "uuid": "3b1cec51-7ad3-4d45-8b55-2088f85d6bc2",
                        "name": "eu ea aliqua",
                        "slug": "eu-ea-aliqua",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-12-12T15:25:50.186 +08:00",
                        "created_by": 9,
                        "updated_at": "2012-02-07T09:32:04.235 +08:00",
                        "updated_by": 5
                    },
                    {
                        "id": 17,
                        "uuid": "4638890e-3013-4a18-8000-e7585bcc1e9e",
                        "name": "ut cillum sint",
                        "slug": "ut-cillum-sint",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-06-04T09:39:21.442 +07:00",
                        "created_by": 9,
                        "updated_at": "2014-03-29T14:36:46.392 +07:00",
                        "updated_by": 0
                    }
                ]
            },
            {
                "id": 18,
                "uuid": "406bbbeb-e3c9-4010-81f7-0b3c9d44d42d",
                "status": "draft",
                "title": "anim cillum irure cupidatat velit nisi aute Lorem non cillum",
                "slug": "anim-cillum-irure-cupidatat-velit-nisi-aute-Lorem-non-cillum",
                "markdown": "Tempor dolore commodo do ipsum cillum. Laborum ad occaecat culpa incididunt sunt ipsum consequat fugiat enim est aliquip. Ut laboris id commodo ipsum duis in.\r\nOccaecat esse labore esse id reprehenderit reprehenderit quis irure commodo excepteur incididunt. Mollit fugiat qui qui qui enim laborum pariatur cillum et dolor. Non voluptate velit proident consequat labore enim quis et aliquip minim fugiat do minim reprehenderit. Duis ad duis elit do incididunt dolor eiusmod est in ipsum. Velit quis tempor elit dolor nulla in magna dolor labore enim non.\r\nLaboris in officia ex voluptate qui adipisicing ea elit deserunt. Exercitation elit laboris ex labore excepteur ipsum cupidatat velit commodo. Dolore sint cillum nostrud culpa occaecat deserunt aute commodo ullamco ea aute culpa nostrud.\r\nTempor deserunt dolor voluptate laboris sit esse duis adipisicing exercitation magna irure eiusmod pariatur veniam. Ullamco ea pariatur dolore duis fugiat dolore fugiat veniam commodo. Lorem esse magna nostrud ad incididunt. Proident et consectetur culpa dolor officia in. Proident occaecat qui eu aliqua id esse deserunt veniam amet id sint. In occaecat est veniam voluptate et nulla.\r\nVoluptate ex incididunt Lorem adipisicing dolor adipisicing. Ex cupidatat eiusmod cillum qui. Excepteur ad nulla laboris quis deserunt ut.\r\nExercitation culpa culpa quis ea exercitation ullamco eiusmod et aliqua cillum sit. Fugiat ipsum eiusmod eiusmod nostrud. Nisi amet excepteur duis exercitation tempor. Aliquip sunt et consectetur aliquip qui tempor adipisicing culpa magna laborum duis enim commodo. Duis aute incididunt amet sit fugiat labore dolor aliquip sunt. Consequat duis magna do nostrud do ad aute fugiat nisi. Exercitation aliquip quis pariatur commodo exercitation ex sunt.\r\nDeserunt cupidatat consequat ea laboris do in adipisicing. Labore nostrud ut est labore velit aute nostrud anim adipisicing et officia sit. Elit laboris eiusmod veniam et. Nisi quis Lorem officia dolor minim duis sit dolore occaecat amet tempor mollit irure. Ullamco commodo quis sint amet qui consectetur eu enim esse.\r\nEnim non sunt esse mollit excepteur duis eiusmod est esse eu velit. Est amet et minim consequat mollit sunt non est Lorem. Sit ut dolore eu magna nostrud aliquip id incididunt exercitation esse quis eu. Aliquip culpa quis officia labore velit quis sint sint proident adipisicing laborum aliqua incididunt fugiat. Labore in laborum nisi aute occaecat quis. Esse culpa velit incididunt exercitation sunt incididunt magna aliquip ex.\r\nNulla ullamco cillum laborum laboris et elit magna. Aliqua cillum qui incididunt velit laborum excepteur. Nulla minim ullamco ut dolor laborum eiusmod nulla aliquip. Anim veniam magna veniam nisi deserunt.\r\nNisi commodo adipisicing voluptate dolor id consectetur tempor. Reprehenderit culpa adipisicing voluptate aliquip labore sit est nostrud fugiat non qui amet nisi duis. Tempor duis officia tempor nisi anim sit anim nisi do. Non sint occaecat deserunt ipsum deserunt non ut commodo culpa id. Velit anim excepteur ea sunt minim elit cillum velit consequat est Lorem deserunt laboris nostrud.\r\n",
                "html": "<p>Tempor dolore commodo do ipsum cillum. Laborum ad occaecat culpa incididunt sunt ipsum consequat fugiat enim est aliquip. Ut laboris id commodo ipsum duis in.\r\nOccaecat esse labore esse id reprehenderit reprehenderit quis irure commodo excepteur incididunt. Mollit fugiat qui qui qui enim laborum pariatur cillum et dolor. Non voluptate velit proident consequat labore enim quis et aliquip minim fugiat do minim reprehenderit. Duis ad duis elit do incididunt dolor eiusmod est in ipsum. Velit quis tempor elit dolor nulla in magna dolor labore enim non.\r\nLaboris in officia ex voluptate qui adipisicing ea elit deserunt. Exercitation elit laboris ex labore excepteur ipsum cupidatat velit commodo. Dolore sint cillum nostrud culpa occaecat deserunt aute commodo ullamco ea aute culpa nostrud.\r\nTempor deserunt dolor voluptate laboris sit esse duis adipisicing exercitation magna irure eiusmod pariatur veniam. Ullamco ea pariatur dolore duis fugiat dolore fugiat veniam commodo. Lorem esse magna nostrud ad incididunt. Proident et consectetur culpa dolor officia in. Proident occaecat qui eu aliqua id esse deserunt veniam amet id sint. In occaecat est veniam voluptate et nulla.\r\nVoluptate ex incididunt Lorem adipisicing dolor adipisicing. Ex cupidatat eiusmod cillum qui. Excepteur ad nulla laboris quis deserunt ut.\r\nExercitation culpa culpa quis ea exercitation ullamco eiusmod et aliqua cillum sit. Fugiat ipsum eiusmod eiusmod nostrud. Nisi amet excepteur duis exercitation tempor. Aliquip sunt et consectetur aliquip qui tempor adipisicing culpa magna laborum duis enim commodo. Duis aute incididunt amet sit fugiat labore dolor aliquip sunt. Consequat duis magna do nostrud do ad aute fugiat nisi. Exercitation aliquip quis pariatur commodo exercitation ex sunt.\r\nDeserunt cupidatat consequat ea laboris do in adipisicing. Labore nostrud ut est labore velit aute nostrud anim adipisicing et officia sit. Elit laboris eiusmod veniam et. Nisi quis Lorem officia dolor minim duis sit dolore occaecat amet tempor mollit irure. Ullamco commodo quis sint amet qui consectetur eu enim esse.\r\nEnim non sunt esse mollit excepteur duis eiusmod est esse eu velit. Est amet et minim consequat mollit sunt non est Lorem. Sit ut dolore eu magna nostrud aliquip id incididunt exercitation esse quis eu. Aliquip culpa quis officia labore velit quis sint sint proident adipisicing laborum aliqua incididunt fugiat. Labore in laborum nisi aute occaecat quis. Esse culpa velit incididunt exercitation sunt incididunt magna aliquip ex.\r\nNulla ullamco cillum laborum laboris et elit magna. Aliqua cillum qui incididunt velit laborum excepteur. Nulla minim ullamco ut dolor laborum eiusmod nulla aliquip. Anim veniam magna veniam nisi deserunt.\r\nNisi commodo adipisicing voluptate dolor id consectetur tempor. Reprehenderit culpa adipisicing voluptate aliquip labore sit est nostrud fugiat non qui amet nisi duis. Tempor duis officia tempor nisi anim sit anim nisi do. Non sint occaecat deserunt ipsum deserunt non ut commodo culpa id. Velit anim excepteur ea sunt minim elit cillum velit consequat est Lorem deserunt laboris nostrud.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 6,
                    "uuid": "4f445e6b-2d17-429d-87cc-d5a03b06f381",
                    "name": "Haney Berg",
                    "slug": "haney-berg",
                    "email": "haneyberg@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "labore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-02-26T02:28:31.501 +08:00",
                    "updated_at": "2013-04-12T03:55:07.221 +07:00"
                },
                "created_at": "2014-02-03T06:53:47.809 +08:00",
                "created_by": {
                    "id": 8,
                    "uuid": "e900d337-4879-4b7e-84d3-3beb2659fa16",
                    "name": "Carroll Horton",
                    "slug": "carroll-horton",
                    "email": "carrollhorton@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "cupidatat sint elit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-06-20T00:03:01.618 +07:00",
                    "updated_at": "2013-08-01T08:00:09.352 +07:00"
                },
                "updated_at": "2014-01-02T16:48:36.743 +08:00",
                "updated_by": {
                    "id": 6,
                    "uuid": "2a1ff9d5-746a-41b6-995b-d03733d80394",
                    "name": "Corine Morse",
                    "slug": "corine-morse",
                    "email": "corinemorse@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "eiusmod",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-06-03T06:01:43.713 +07:00",
                    "updated_at": "2013-01-31T09:04:44.277 +08:00"
                },
                "published_at": "2012-03-01T15:27:54.153 +08:00",
                "published_by": {
                    "id": 4,
                    "uuid": "512c09c8-8758-4c7e-9303-d365e5615c94",
                    "name": "Vonda Swanson",
                    "slug": "vonda-swanson",
                    "email": "vondaswanson@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "laboris",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-03-19T10:03:08.274 +07:00",
                    "updated_at": "2013-02-24T09:42:40.320 +08:00"
                },
                "tags": [
                    {
                        "id": 14,
                        "uuid": "27865fb4-da4c-49aa-94c5-c9d8dbf32b8f",
                        "name": "amet aliqua",
                        "slug": "amet-aliqua",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-12-03T07:58:04.400 +08:00",
                        "created_by": 8,
                        "updated_at": "2013-07-31T20:30:45.467 +07:00",
                        "updated_by": 10
                    },
                    {
                        "id": 47,
                        "uuid": "be929fe5-5e94-43c8-9a1b-1d6ac944e3a6",
                        "name": "id",
                        "slug": "id",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-24T22:26:23.841 +08:00",
                        "created_by": 8,
                        "updated_at": "2012-03-21T18:05:41.996 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 39,
                        "uuid": "83347bbe-bf78-4947-9a8c-5a1266e50cb3",
                        "name": "laboris",
                        "slug": "laboris",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-09-03T15:20:52.481 +07:00",
                        "created_by": 9,
                        "updated_at": "2012-03-20T02:34:15.149 +07:00",
                        "updated_by": 3
                    }
                ]
            },
            {
                "id": 19,
                "uuid": "04f33834-1cb5-433f-b241-9a19a324477d",
                "status": "published",
                "title": "deserunt proident voluptate",
                "slug": "deserunt-proident-voluptate",
                "markdown": "Enim laboris cupidatat dolore Lorem exercitation qui aliquip eu esse laborum nostrud. Amet commodo eu eiusmod fugiat sint consectetur duis veniam aliqua. Veniam non est eu exercitation tempor anim magna minim consequat ad commodo id Lorem minim. Esse adipisicing cupidatat eu irure dolore in officia ex.\r\n",
                "html": "<p>Enim laboris cupidatat dolore Lorem exercitation qui aliquip eu esse laborum nostrud. Amet commodo eu eiusmod fugiat sint consectetur duis veniam aliqua. Veniam non est eu exercitation tempor anim magna minim consequat ad commodo id Lorem minim. Esse adipisicing cupidatat eu irure dolore in officia ex.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 4,
                    "uuid": "3769d6a5-1008-42d7-8877-b651df512531",
                    "name": "Sallie Pena",
                    "slug": "sallie-pena",
                    "email": "salliepena@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ex irure",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-04-10T22:44:37.315 +07:00",
                    "updated_at": "2012-04-22T12:54:49.967 +07:00"
                },
                "created_at": "2014-03-08T21:06:10.709 +08:00",
                "created_by": {
                    "id": 5,
                    "uuid": "52e2b08b-9c43-49ed-9807-f624cde2a237",
                    "name": "Nolan Webster",
                    "slug": "nolan-webster",
                    "email": "nolanwebster@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "excepteur elit esse",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-11-01T14:10:37.301 +07:00",
                    "updated_at": "2012-05-26T05:00:17.133 +07:00"
                },
                "updated_at": "2012-10-19T00:36:10.656 +07:00",
                "updated_by": {
                    "id": 6,
                    "uuid": "5bf0b823-b055-461b-8aad-5c0d6b0f19dd",
                    "name": "Tamara Moreno",
                    "slug": "tamara-moreno",
                    "email": "tamaramoreno@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "culpa quis mollit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-04-12T01:08:51.095 +07:00",
                    "updated_at": "2013-11-26T13:00:47.654 +08:00"
                },
                "published_at": "2014-01-05T11:54:00.018 +08:00",
                "published_by": {
                    "id": 2,
                    "uuid": "6fde9807-d812-4d07-87b1-66d78f21a4a1",
                    "name": "Alberta Schneider",
                    "slug": "alberta-schneider",
                    "email": "albertaschneider@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "minim",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-05-11T06:07:44.545 +07:00",
                    "updated_at": "2012-05-06T11:33:13.866 +07:00"
                },
                "tags": [
                    {
                        "id": 73,
                        "uuid": "5065a3b3-94aa-4788-a4ad-bf69964ce568",
                        "name": "reprehenderit commodo",
                        "slug": "reprehenderit-commodo",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-07T13:34:19.279 +08:00",
                        "created_by": 3,
                        "updated_at": "2012-03-23T04:31:44.613 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 93,
                        "uuid": "c54e2cd1-1ed1-43df-a48a-9a6d96be6e46",
                        "name": "dolore",
                        "slug": "dolore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-02-20T16:10:10.523 +08:00",
                        "created_by": 10,
                        "updated_at": "2012-11-13T03:24:30.913 +08:00",
                        "updated_by": 6
                    },
                    {
                        "id": 30,
                        "uuid": "75312955-10f8-4cdf-8eb2-c28ae8b78688",
                        "name": "qui",
                        "slug": "qui",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-01-05T02:22:11.787 +08:00",
                        "created_by": 9,
                        "updated_at": "2013-06-27T04:27:26.521 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 62,
                        "uuid": "e2f593b8-9974-44b7-a3b1-25ecbc963d90",
                        "name": "do ad",
                        "slug": "do-ad",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-08-20T15:39:27.081 +07:00",
                        "created_by": 8,
                        "updated_at": "2013-04-30T21:41:54.158 +07:00",
                        "updated_by": 3
                    }
                ]
            },
            {
                "id": 20,
                "uuid": "99aaa753-d921-493f-abb4-7008e4d59d39",
                "status": "published",
                "title": "ad adipisicing duis",
                "slug": "ad-adipisicing-duis",
                "markdown": "Culpa ea proident nisi ullamco minim ullamco eiusmod elit nulla. Consequat ullamco nostrud velit incididunt. Nostrud Lorem cupidatat aliquip cillum id adipisicing qui in. Ut dolore elit excepteur labore quis laborum culpa excepteur quis duis ipsum dolore. Tempor fugiat cillum irure incididunt.\r\nAd nisi laborum nostrud exercitation Lorem Lorem ad aute enim id cillum. Mollit laborum pariatur voluptate adipisicing id occaecat reprehenderit. Dolore ut occaecat proident non sint ut do eiusmod pariatur incididunt ut ad pariatur. Aute excepteur aute pariatur ipsum sunt minim cillum consectetur eu irure eu amet non dolore. Commodo nisi nulla id deserunt nisi laboris ipsum minim ut sint sunt nisi in incididunt. Sint aliquip cupidatat ea fugiat nostrud non. Eu irure culpa nisi occaecat commodo irure.\r\nEnim adipisicing ad Lorem in ex nisi et quis consectetur ipsum. Aliqua mollit ipsum sint non cillum labore mollit ipsum pariatur eu pariatur. Velit in anim commodo anim culpa.\r\n",
                "html": "<p>Culpa ea proident nisi ullamco minim ullamco eiusmod elit nulla. Consequat ullamco nostrud velit incididunt. Nostrud Lorem cupidatat aliquip cillum id adipisicing qui in. Ut dolore elit excepteur labore quis laborum culpa excepteur quis duis ipsum dolore. Tempor fugiat cillum irure incididunt.\r\nAd nisi laborum nostrud exercitation Lorem Lorem ad aute enim id cillum. Mollit laborum pariatur voluptate adipisicing id occaecat reprehenderit. Dolore ut occaecat proident non sint ut do eiusmod pariatur incididunt ut ad pariatur. Aute excepteur aute pariatur ipsum sunt minim cillum consectetur eu irure eu amet non dolore. Commodo nisi nulla id deserunt nisi laboris ipsum minim ut sint sunt nisi in incididunt. Sint aliquip cupidatat ea fugiat nostrud non. Eu irure culpa nisi occaecat commodo irure.\r\nEnim adipisicing ad Lorem in ex nisi et quis consectetur ipsum. Aliqua mollit ipsum sint non cillum labore mollit ipsum pariatur eu pariatur. Velit in anim commodo anim culpa.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 6,
                    "uuid": "c74d3852-d113-4c0c-ab0b-2ddb51b66b22",
                    "name": "Ada Wilkerson",
                    "slug": "ada-wilkerson",
                    "email": "adawilkerson@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolor",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-02-23T16:15:32.518 +08:00",
                    "updated_at": "2013-09-05T16:17:40.773 +07:00"
                },
                "created_at": "2013-07-11T22:14:50.729 +07:00",
                "created_by": {
                    "id": 4,
                    "uuid": "1d8f88e9-f62f-48f0-bc62-4a5f21e9485e",
                    "name": "Lindsey Lee",
                    "slug": "lindsey-lee",
                    "email": "lindseylee@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "cupidatat esse",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-04T07:57:36.995 +07:00",
                    "updated_at": "2013-07-09T12:35:19.965 +07:00"
                },
                "updated_at": "2012-05-28T18:31:53.655 +07:00",
                "updated_by": {
                    "id": 3,
                    "uuid": "d3c368ef-bab1-43cb-8be4-7bbe4d639688",
                    "name": "Katie Salas",
                    "slug": "katie-salas",
                    "email": "katiesalas@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "nisi eu",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-01-27T12:08:40.357 +08:00",
                    "updated_at": "2013-11-14T20:29:25.901 +08:00"
                },
                "published_at": "2013-11-30T22:25:48.276 +08:00",
                "published_by": {
                    "id": 8,
                    "uuid": "42fc9fa2-ea49-440a-b288-ba5e315d6e96",
                    "name": "Marissa Dotson",
                    "slug": "marissa-dotson",
                    "email": "marissadotson@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "consectetur sit laborum",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-05-19T18:58:59.591 +07:00",
                    "updated_at": "2013-05-24T01:35:57.309 +07:00"
                },
                "tags": [
                    {
                        "id": 81,
                        "uuid": "c5a60f8d-dae2-46a9-b5fa-451bfefbb3bd",
                        "name": "mollit laborum",
                        "slug": "mollit-laborum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-31T01:07:09.188 +08:00",
                        "created_by": 5,
                        "updated_at": "2013-11-02T00:52:49.417 +07:00",
                        "updated_by": 2
                    },
                    {
                        "id": 84,
                        "uuid": "6f88b74c-f4ec-4f47-83c3-89002733dba2",
                        "name": "labore consequat",
                        "slug": "labore-consequat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-02-18T07:35:54.095 +08:00",
                        "created_by": 6,
                        "updated_at": "2013-05-28T05:23:17.738 +07:00",
                        "updated_by": 3
                    },
                    {
                        "id": 23,
                        "uuid": "607d15cb-9d7e-4897-9d01-b52c84bb9308",
                        "name": "qui labore voluptate",
                        "slug": "qui-labore-voluptate",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-17T19:47:30.610 +08:00",
                        "created_by": 0,
                        "updated_at": "2013-01-04T16:45:11.821 +08:00",
                        "updated_by": 7
                    },
                    {
                        "id": 94,
                        "uuid": "4d879bd7-3470-447c-98aa-f84048ce21aa",
                        "name": "ullamco magna nostrud",
                        "slug": "ullamco-magna-nostrud",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-08-27T22:53:59.617 +07:00",
                        "created_by": 8,
                        "updated_at": "2013-07-21T02:38:47.048 +07:00",
                        "updated_by": 2
                    }
                ]
            },
            {
                "id": 21,
                "uuid": "cf71bf39-b8dd-46ee-874f-a9c5ce6b000d",
                "status": "published",
                "title": "esse do",
                "slug": "esse-do",
                "markdown": "Id nisi ea adipisicing nisi id voluptate nulla reprehenderit aliqua labore. Ex voluptate consequat proident esse. Ut commodo Lorem pariatur mollit elit dolor aliquip veniam do excepteur culpa duis laborum veniam. Ut dolore et aliqua adipisicing Lorem et cillum dolore sit labore in cupidatat pariatur labore.\r\nCupidatat cillum et irure quis anim enim. Anim exercitation sit ipsum est consectetur. Anim do cillum nulla nulla commodo irure do aliquip nulla. Deserunt voluptate elit in tempor nostrud esse nisi eu ad.\r\nDuis nulla quis aliqua labore consectetur id reprehenderit sunt cupidatat quis. Incididunt magna enim ipsum aliquip culpa est enim tempor non ullamco. Exercitation laborum qui fugiat excepteur labore occaecat ut ipsum laborum ea. Reprehenderit in excepteur minim ea. Dolor sit aliqua aute aliquip laborum adipisicing ullamco laborum pariatur aute consectetur quis consequat. Mollit nulla ad culpa id do elit.\r\n",
                "html": "<p>Id nisi ea adipisicing nisi id voluptate nulla reprehenderit aliqua labore. Ex voluptate consequat proident esse. Ut commodo Lorem pariatur mollit elit dolor aliquip veniam do excepteur culpa duis laborum veniam. Ut dolore et aliqua adipisicing Lorem et cillum dolore sit labore in cupidatat pariatur labore.\r\nCupidatat cillum et irure quis anim enim. Anim exercitation sit ipsum est consectetur. Anim do cillum nulla nulla commodo irure do aliquip nulla. Deserunt voluptate elit in tempor nostrud esse nisi eu ad.\r\nDuis nulla quis aliqua labore consectetur id reprehenderit sunt cupidatat quis. Incididunt magna enim ipsum aliquip culpa est enim tempor non ullamco. Exercitation laborum qui fugiat excepteur labore occaecat ut ipsum laborum ea. Reprehenderit in excepteur minim ea. Dolor sit aliqua aute aliquip laborum adipisicing ullamco laborum pariatur aute consectetur quis consequat. Mollit nulla ad culpa id do elit.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 8,
                    "uuid": "2b525549-3789-446b-9186-4fbc60d95a8a",
                    "name": "Mcdonald Sheppard",
                    "slug": "mcdonald-sheppard",
                    "email": "mcdonaldsheppard@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "sint",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-02-22T10:10:31.446 +08:00",
                    "updated_at": "2013-08-03T02:20:13.113 +07:00"
                },
                "created_at": "2014-01-02T17:33:13.294 +08:00",
                "created_by": {
                    "id": 4,
                    "uuid": "47e15826-cb79-4099-ad2f-6bc621d74a2c",
                    "name": "Trujillo Donovan",
                    "slug": "trujillo-donovan",
                    "email": "trujillodonovan@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "in incididunt",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-01-28T16:31:13.511 +08:00",
                    "updated_at": "2013-09-08T22:03:30.771 +07:00"
                },
                "updated_at": "2014-02-01T11:45:10.939 +08:00",
                "updated_by": {
                    "id": 2,
                    "uuid": "59cd91ca-77aa-4ee2-afb8-684b8fc350a8",
                    "name": "Ryan Fields",
                    "slug": "ryan-fields",
                    "email": "ryanfields@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "qui dolor",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-08-27T21:35:13.010 +07:00",
                    "updated_at": "2014-05-16T03:10:17.111 +07:00"
                },
                "published_at": "2012-06-29T20:30:29.564 +07:00",
                "published_by": {
                    "id": 7,
                    "uuid": "5410692e-2a25-4177-90ec-1d6f8ac2502e",
                    "name": "Cherry Kane",
                    "slug": "cherry-kane",
                    "email": "cherrykane@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "consequat",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-05-16T23:12:49.677 +07:00",
                    "updated_at": "2012-10-30T21:20:55.537 +07:00"
                },
                "tags": [
                    {
                        "id": 99,
                        "uuid": "7847fc6c-339d-4ff1-96ed-b8ee02fd6435",
                        "name": "anim do est",
                        "slug": "anim-do-est",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-12-02T00:20:26.630 +08:00",
                        "created_by": 2,
                        "updated_at": "2013-04-18T09:31:12.070 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 82,
                        "uuid": "47b351f6-987a-4723-9782-b710566661bb",
                        "name": "officia",
                        "slug": "officia",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-09-13T04:15:28.360 +07:00",
                        "created_by": 5,
                        "updated_at": "2013-04-05T15:31:18.440 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 18,
                        "uuid": "cecdc1a1-b5b9-4ba6-967d-e2847b27ccb8",
                        "name": "mollit culpa est",
                        "slug": "mollit-culpa-est",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-10-26T10:18:19.035 +07:00",
                        "created_by": 9,
                        "updated_at": "2013-03-22T01:39:01.136 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 81,
                        "uuid": "bdea7ebb-03fb-4dfa-b098-a3a2dbee1691",
                        "name": "ex",
                        "slug": "ex",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-05-10T06:32:32.957 +07:00",
                        "created_by": 10,
                        "updated_at": "2013-01-17T22:38:48.482 +08:00",
                        "updated_by": 8
                    },
                    {
                        "id": 60,
                        "uuid": "9df90686-76ff-475d-a98c-2ac600a47209",
                        "name": "laboris dolore dolore",
                        "slug": "laboris-dolore-dolore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-08-08T01:07:35.774 +07:00",
                        "created_by": 6,
                        "updated_at": "2014-02-15T01:40:23.412 +08:00",
                        "updated_by": 10
                    },
                    {
                        "id": 42,
                        "uuid": "3d615b99-21a5-4f34-9975-5cbe8c3a08fd",
                        "name": "deserunt",
                        "slug": "deserunt",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-03-17T09:57:23.938 +07:00",
                        "created_by": 6,
                        "updated_at": "2012-06-28T16:07:27.900 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 27,
                        "uuid": "5cc76add-f722-440f-99ed-15781cb28430",
                        "name": "eiusmod in exercitation",
                        "slug": "eiusmod-in-exercitation",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-01-01T06:46:22.090 +08:00",
                        "created_by": 10,
                        "updated_at": "2013-06-12T12:41:01.220 +07:00",
                        "updated_by": 2
                    }
                ]
            },
            {
                "id": 22,
                "uuid": "08c2f77e-541d-4543-a97e-617a3362a56b",
                "status": "draft",
                "title": "non tempor tempor",
                "slug": "non-tempor-tempor",
                "markdown": "Aliqua aute fugiat culpa in irure voluptate qui in qui. Adipisicing velit nulla voluptate culpa. Do esse sunt dolore labore voluptate mollit ex aliquip occaecat mollit ea.\r\nTempor eiusmod ea magna esse cillum occaecat velit cupidatat minim duis cupidatat reprehenderit ex anim. Esse nisi nisi veniam fugiat cillum cupidatat est veniam. Cupidatat pariatur mollit sit commodo non anim voluptate aliqua cupidatat. Nostrud ut sunt laborum veniam pariatur excepteur in cillum elit magna. Officia aute eu nisi qui deserunt pariatur cupidatat sint culpa nisi reprehenderit nisi aliquip. Velit elit amet sint ipsum officia sit consequat ipsum occaecat. Sunt quis et proident sit fugiat laborum sunt voluptate.\r\nUllamco cillum ex exercitation quis. Cillum enim quis non voluptate sunt velit est nisi ullamco ullamco fugiat velit labore. Aute culpa qui consectetur Lorem dolore exercitation sint voluptate sint fugiat aliqua exercitation duis occaecat. Fugiat enim pariatur excepteur pariatur laboris deserunt. Officia non officia deserunt eu reprehenderit ex quis commodo pariatur sit cupidatat voluptate.\r\nTempor quis deserunt laborum occaecat et sunt enim laborum enim nulla ipsum minim commodo duis. Laborum ad et id aute consequat. Fugiat aliquip esse quis incididunt Lorem. Laborum nisi non laboris irure et eu laborum cupidatat aute aute consequat amet. Lorem in ea tempor incididunt mollit incididunt cillum eiusmod.\r\nAnim enim sint mollit ullamco occaecat elit pariatur incididunt ut adipisicing voluptate consectetur reprehenderit qui. Nostrud non amet dolore nisi officia veniam ullamco cupidatat qui dolore sint culpa. Minim adipisicing velit ea laborum aliqua est officia nulla. Officia occaecat ex pariatur magna ipsum. Commodo ipsum laborum cupidatat aliquip ut.\r\nProident aliquip ut mollit ullamco deserunt minim est cillum nisi. Eu nulla aliquip Lorem proident. Ullamco excepteur est duis dolore laborum aliquip aliqua. Culpa deserunt est duis nisi in. Tempor aliquip culpa cillum officia aliquip veniam.\r\n",
                "html": "<p>Aliqua aute fugiat culpa in irure voluptate qui in qui. Adipisicing velit nulla voluptate culpa. Do esse sunt dolore labore voluptate mollit ex aliquip occaecat mollit ea.\r\nTempor eiusmod ea magna esse cillum occaecat velit cupidatat minim duis cupidatat reprehenderit ex anim. Esse nisi nisi veniam fugiat cillum cupidatat est veniam. Cupidatat pariatur mollit sit commodo non anim voluptate aliqua cupidatat. Nostrud ut sunt laborum veniam pariatur excepteur in cillum elit magna. Officia aute eu nisi qui deserunt pariatur cupidatat sint culpa nisi reprehenderit nisi aliquip. Velit elit amet sint ipsum officia sit consequat ipsum occaecat. Sunt quis et proident sit fugiat laborum sunt voluptate.\r\nUllamco cillum ex exercitation quis. Cillum enim quis non voluptate sunt velit est nisi ullamco ullamco fugiat velit labore. Aute culpa qui consectetur Lorem dolore exercitation sint voluptate sint fugiat aliqua exercitation duis occaecat. Fugiat enim pariatur excepteur pariatur laboris deserunt. Officia non officia deserunt eu reprehenderit ex quis commodo pariatur sit cupidatat voluptate.\r\nTempor quis deserunt laborum occaecat et sunt enim laborum enim nulla ipsum minim commodo duis. Laborum ad et id aute consequat. Fugiat aliquip esse quis incididunt Lorem. Laborum nisi non laboris irure et eu laborum cupidatat aute aute consequat amet. Lorem in ea tempor incididunt mollit incididunt cillum eiusmod.\r\nAnim enim sint mollit ullamco occaecat elit pariatur incididunt ut adipisicing voluptate consectetur reprehenderit qui. Nostrud non amet dolore nisi officia veniam ullamco cupidatat qui dolore sint culpa. Minim adipisicing velit ea laborum aliqua est officia nulla. Officia occaecat ex pariatur magna ipsum. Commodo ipsum laborum cupidatat aliquip ut.\r\nProident aliquip ut mollit ullamco deserunt minim est cillum nisi. Eu nulla aliquip Lorem proident. Ullamco excepteur est duis dolore laborum aliquip aliqua. Culpa deserunt est duis nisi in. Tempor aliquip culpa cillum officia aliquip veniam.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 9,
                    "uuid": "3eb510fc-9aeb-4d93-a648-9ce353762b54",
                    "name": "Lilian Beck",
                    "slug": "lilian-beck",
                    "email": "lilianbeck@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "Lorem",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-05-04T23:47:51.265 +07:00",
                    "updated_at": "2012-11-19T10:44:32.989 +08:00"
                },
                "created_at": "2012-07-30T07:51:41.349 +07:00",
                "created_by": {
                    "id": 3,
                    "uuid": "4839667f-64a3-4b87-b11d-015033f2dd39",
                    "name": "Dalton Lowe",
                    "slug": "dalton-lowe",
                    "email": "daltonlowe@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "anim ipsum est",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-05-12T21:40:58.579 +07:00",
                    "updated_at": "2014-01-23T05:37:52.096 +08:00"
                },
                "updated_at": "2013-06-10T04:00:01.711 +07:00",
                "updated_by": {
                    "id": 9,
                    "uuid": "811095e4-67ce-48fe-a5d7-9b1ba8afc360",
                    "name": "Leanne Kemp",
                    "slug": "leanne-kemp",
                    "email": "leannekemp@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "eiusmod sunt exercitation",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-01-18T13:52:54.090 +08:00",
                    "updated_at": "2012-08-15T12:43:41.939 +07:00"
                },
                "published_at": "2014-03-03T16:56:57.917 +08:00",
                "published_by": {
                    "id": 6,
                    "uuid": "5000f02d-930d-4df3-bfa0-4e9da77fe1ab",
                    "name": "Heather Barron",
                    "slug": "heather-barron",
                    "email": "heatherbarron@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "eu",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-08T00:08:05.762 +07:00",
                    "updated_at": "2012-10-10T18:31:04.141 +07:00"
                },
                "tags": [
                    {
                        "id": 45,
                        "uuid": "9204c729-fe74-493b-98cb-995493207d3d",
                        "name": "nisi",
                        "slug": "nisi",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-12-06T21:36:47.151 +08:00",
                        "created_by": 7,
                        "updated_at": "2012-01-19T11:15:09.333 +08:00",
                        "updated_by": 0
                    },
                    {
                        "id": 47,
                        "uuid": "3b5d226a-8a35-4b67-87a1-538d7fa1eb17",
                        "name": "sit tempor",
                        "slug": "sit-tempor",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-05-03T19:17:35.484 +07:00",
                        "created_by": 9,
                        "updated_at": "2014-04-03T19:41:53.035 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 21,
                        "uuid": "832eae06-11e2-41ed-a0ea-50143ca22284",
                        "name": "exercitation et",
                        "slug": "exercitation-et",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-16T18:52:14.807 +08:00",
                        "created_by": 7,
                        "updated_at": "2013-09-23T08:40:07.940 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 77,
                        "uuid": "e7d9ae99-7b05-4373-a438-45088998505f",
                        "name": "officia ea cillum",
                        "slug": "officia-ea-cillum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-10-16T10:48:43.208 +07:00",
                        "created_by": 7,
                        "updated_at": "2013-07-25T09:48:16.237 +07:00",
                        "updated_by": 3
                    }
                ]
            },
            {
                "id": 23,
                "uuid": "4e7617d7-dcb9-45a5-98ca-9410ed1a4304",
                "status": "draft",
                "title": "ipsum",
                "slug": "ipsum",
                "markdown": "Cillum sit sint enim voluptate exercitation ut cupidatat irure nulla exercitation laborum cupidatat ut. Occaecat mollit reprehenderit excepteur id laborum cupidatat sunt quis quis do eiusmod ullamco qui nisi. Cillum quis consequat consectetur irure voluptate officia cupidatat aute veniam do.\r\n",
                "html": "<p>Cillum sit sint enim voluptate exercitation ut cupidatat irure nulla exercitation laborum cupidatat ut. Occaecat mollit reprehenderit excepteur id laborum cupidatat sunt quis quis do eiusmod ullamco qui nisi. Cillum quis consequat consectetur irure voluptate officia cupidatat aute veniam do.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 6,
                    "uuid": "5f8d40d3-c7ff-46dc-ba99-47bc740cb213",
                    "name": "Araceli Leach",
                    "slug": "araceli-leach",
                    "email": "aracelileach@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolor",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-01T04:29:07.545 +07:00",
                    "updated_at": "2013-12-01T00:16:10.452 +08:00"
                },
                "created_at": "2012-12-06T04:49:39.744 +08:00",
                "created_by": {
                    "id": 4,
                    "uuid": "7e5f993a-c8ed-4583-8961-091f162c0ca2",
                    "name": "Dennis Trevino",
                    "slug": "dennis-trevino",
                    "email": "dennistrevino@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "fugiat anim",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-04-30T03:13:27.382 +07:00",
                    "updated_at": "2013-09-28T02:18:39.222 +07:00"
                },
                "updated_at": "2012-03-13T13:27:41.870 +07:00",
                "updated_by": {
                    "id": 7,
                    "uuid": "e81508e8-65fe-4acc-bf24-123ce7696c2d",
                    "name": "Petra Workman",
                    "slug": "petra-workman",
                    "email": "petraworkman@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "occaecat ipsum",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-09-13T02:32:51.546 +07:00",
                    "updated_at": "2013-05-06T22:22:30.629 +07:00"
                },
                "published_at": "2012-10-05T06:22:24.206 +07:00",
                "published_by": {
                    "id": 2,
                    "uuid": "2a854471-9e50-4bd2-bf19-618163491d98",
                    "name": "Gwendolyn Lewis",
                    "slug": "gwendolyn-lewis",
                    "email": "gwendolynlewis@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "amet",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-05-12T20:50:53.020 +07:00",
                    "updated_at": "2013-09-24T06:08:40.967 +07:00"
                },
                "tags": [
                    {
                        "id": 68,
                        "uuid": "665e4926-2453-4001-b7d5-c39c4a28ab3b",
                        "name": "nostrud ex consequat",
                        "slug": "nostrud-ex-consequat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-09-06T15:07:09.778 +07:00",
                        "created_by": 2,
                        "updated_at": "2012-06-17T12:23:46.815 +07:00",
                        "updated_by": 5
                    },
                    {
                        "id": 48,
                        "uuid": "b07b12dc-9514-4fd8-b79d-2cabd0a73e02",
                        "name": "labore",
                        "slug": "labore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-08-12T16:35:28.951 +07:00",
                        "created_by": 2,
                        "updated_at": "2014-02-17T13:51:49.625 +08:00",
                        "updated_by": 2
                    },
                    {
                        "id": 80,
                        "uuid": "20f034b8-f62e-4c9a-9cfb-537939ee0afd",
                        "name": "cillum ea",
                        "slug": "cillum-ea",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-05-30T23:33:31.754 +07:00",
                        "created_by": 1,
                        "updated_at": "2012-11-14T07:15:44.214 +08:00",
                        "updated_by": 7
                    },
                    {
                        "id": 51,
                        "uuid": "7b938a9f-1195-4361-845e-12963ca5345c",
                        "name": "cupidatat minim",
                        "slug": "cupidatat-minim",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-10-05T09:03:30.290 +07:00",
                        "created_by": 10,
                        "updated_at": "2014-05-13T15:22:55.518 +07:00",
                        "updated_by": 1
                    },
                    {
                        "id": 60,
                        "uuid": "2faae7e4-2adb-4bb4-9d94-9a01688480f7",
                        "name": "cillum",
                        "slug": "cillum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-11-04T15:11:55.809 +08:00",
                        "created_by": 5,
                        "updated_at": "2013-06-28T01:29:48.797 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 12,
                        "uuid": "27cc4da2-c47e-47aa-ac22-dda31fa484cb",
                        "name": "culpa non",
                        "slug": "culpa-non",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-18T09:14:54.839 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-08-05T02:07:09.902 +07:00",
                        "updated_by": 2
                    },
                    {
                        "id": 93,
                        "uuid": "b6bea9ee-8a52-45b5-9c43-fecf00e852ab",
                        "name": "magna elit dolore",
                        "slug": "magna-elit-dolore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-06-28T09:45:31.333 +07:00",
                        "created_by": 8,
                        "updated_at": "2014-02-06T12:06:18.649 +08:00",
                        "updated_by": 0
                    },
                    {
                        "id": 75,
                        "uuid": "42cbe9a2-6d2b-4701-810f-a3fd765e35c7",
                        "name": "voluptate",
                        "slug": "voluptate",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-10T18:12:09.003 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-05-19T15:15:04.611 +07:00",
                        "updated_by": 6
                    }
                ]
            },
            {
                "id": 24,
                "uuid": "d36d7f3d-e141-4a50-b9a8-453adff086bc",
                "status": "draft",
                "title": "ut minim",
                "slug": "ut-minim",
                "markdown": "Aliquip fugiat sit mollit ipsum ea aliqua fugiat magna consectetur velit consectetur dolore. Fugiat minim proident et consequat. Ea ipsum dolor adipisicing duis duis deserunt non sint proident. Excepteur culpa commodo dolore eu. Eiusmod aute pariatur aliquip commodo mollit irure ullamco labore. Ex laborum do officia veniam dolor veniam eiusmod ut.\r\nDolore dolor ipsum ut proident nulla amet sunt qui quis laborum occaecat irure excepteur. Duis dolor elit consequat enim in dolor nisi officia. Dolor voluptate do laboris voluptate pariatur mollit nisi consequat sit. Aute aliqua velit Lorem officia cillum occaecat pariatur ad eiusmod id occaecat do eiusmod Lorem. Nostrud cupidatat officia in Lorem ipsum aliqua incididunt.\r\n",
                "html": "<p>Aliquip fugiat sit mollit ipsum ea aliqua fugiat magna consectetur velit consectetur dolore. Fugiat minim proident et consequat. Ea ipsum dolor adipisicing duis duis deserunt non sint proident. Excepteur culpa commodo dolore eu. Eiusmod aute pariatur aliquip commodo mollit irure ullamco labore. Ex laborum do officia veniam dolor veniam eiusmod ut.\r\nDolore dolor ipsum ut proident nulla amet sunt qui quis laborum occaecat irure excepteur. Duis dolor elit consequat enim in dolor nisi officia. Dolor voluptate do laboris voluptate pariatur mollit nisi consequat sit. Aute aliqua velit Lorem officia cillum occaecat pariatur ad eiusmod id occaecat do eiusmod Lorem. Nostrud cupidatat officia in Lorem ipsum aliqua incididunt.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 5,
                    "uuid": "6a858a8d-78f6-48ed-b281-327cd776b260",
                    "name": "Hull Lowery",
                    "slug": "hull-lowery",
                    "email": "hulllowery@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "do",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-01-07T03:12:27.342 +08:00",
                    "updated_at": "2012-02-10T19:52:17.309 +08:00"
                },
                "created_at": "2014-03-19T02:41:04.324 +07:00",
                "created_by": {
                    "id": 5,
                    "uuid": "26c173df-c83c-48b4-af5f-9a7f591926b5",
                    "name": "English Clay",
                    "slug": "english-clay",
                    "email": "englishclay@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "magna ex officia",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-08-16T22:58:27.914 +07:00",
                    "updated_at": "2013-09-17T01:06:27.833 +07:00"
                },
                "updated_at": "2012-01-17T08:36:48.351 +08:00",
                "updated_by": {
                    "id": 1,
                    "uuid": "4c6e411e-2b93-402b-83bc-bdb720c73705",
                    "name": "Maritza Mullins",
                    "slug": "maritza-mullins",
                    "email": "maritzamullins@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-11-15T17:12:32.207 +08:00",
                    "updated_at": "2012-08-09T18:47:48.353 +07:00"
                },
                "published_at": "2014-02-04T14:26:39.062 +08:00",
                "published_by": {
                    "id": 10,
                    "uuid": "05d85196-245c-48b1-aaa4-96a104121ca3",
                    "name": "Lizzie Silva",
                    "slug": "lizzie-silva",
                    "email": "lizziesilva@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "exercitation consectetur incididunt",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-04-10T10:15:41.790 +07:00",
                    "updated_at": "2012-08-01T18:28:31.881 +07:00"
                },
                "tags": [
                    {
                        "id": 82,
                        "uuid": "5f841997-8514-4b16-a4b7-8a9b28798294",
                        "name": "ad",
                        "slug": "ad",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-02T12:02:08.594 +08:00",
                        "created_by": 7,
                        "updated_at": "2014-04-02T06:05:46.836 +07:00",
                        "updated_by": 1
                    },
                    {
                        "id": 66,
                        "uuid": "b91bcc07-5ef7-4e0f-83f0-4b85db21c1b7",
                        "name": "non elit occaecat",
                        "slug": "non-elit-occaecat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-06-04T05:09:51.015 +07:00",
                        "created_by": 10,
                        "updated_at": "2013-10-13T01:28:12.308 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 63,
                        "uuid": "946f75f1-3018-4965-bc68-07e156d07c97",
                        "name": "irure",
                        "slug": "irure",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-02-16T08:08:58.163 +08:00",
                        "created_by": 4,
                        "updated_at": "2013-06-21T12:58:39.871 +07:00",
                        "updated_by": 2
                    }
                ]
            },
            {
                "id": 25,
                "uuid": "f3256826-c613-482e-bc74-1bb3b74fff08",
                "status": "draft",
                "title": "irure sit dolor sunt tempor fugiat occaecat",
                "slug": "irure-sit-dolor-sunt-tempor-fugiat-occaecat",
                "markdown": "Officia laborum reprehenderit in laborum mollit elit. Exercitation culpa ut officia ipsum fugiat laboris cupidatat. Aute incididunt magna duis Lorem cupidatat elit sit elit aliquip. Voluptate proident officia proident cillum nisi sunt adipisicing laboris irure anim dolor. Irure id ut aliqua amet culpa qui deserunt magna ut anim irure cupidatat. Dolore aliqua mollit irure labore cillum ad adipisicing do in duis est. Id duis qui sint voluptate.\r\nCupidatat est aute elit nisi laboris occaecat culpa officia eiusmod in nostrud in magna qui. Est proident excepteur amet proident amet quis laboris. Enim sunt Lorem duis velit. Dolor aliqua cupidatat do dolor laborum proident sint ullamco reprehenderit et ad laboris irure cupidatat. Laboris enim et minim aliqua velit nisi duis consectetur mollit.\r\nOfficia nisi tempor est commodo ex veniam amet anim fugiat dolor veniam esse ut. Reprehenderit commodo cillum proident consequat. Nisi fugiat Lorem deserunt nisi consequat.\r\n",
                "html": "<p>Officia laborum reprehenderit in laborum mollit elit. Exercitation culpa ut officia ipsum fugiat laboris cupidatat. Aute incididunt magna duis Lorem cupidatat elit sit elit aliquip. Voluptate proident officia proident cillum nisi sunt adipisicing laboris irure anim dolor. Irure id ut aliqua amet culpa qui deserunt magna ut anim irure cupidatat. Dolore aliqua mollit irure labore cillum ad adipisicing do in duis est. Id duis qui sint voluptate.\r\nCupidatat est aute elit nisi laboris occaecat culpa officia eiusmod in nostrud in magna qui. Est proident excepteur amet proident amet quis laboris. Enim sunt Lorem duis velit. Dolor aliqua cupidatat do dolor laborum proident sint ullamco reprehenderit et ad laboris irure cupidatat. Laboris enim et minim aliqua velit nisi duis consectetur mollit.\r\nOfficia nisi tempor est commodo ex veniam amet anim fugiat dolor veniam esse ut. Reprehenderit commodo cillum proident consequat. Nisi fugiat Lorem deserunt nisi consequat.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 7,
                    "uuid": "5ca96a41-0830-4eae-bb28-9ceef37f0155",
                    "name": "Leanna Ortiz",
                    "slug": "leanna-ortiz",
                    "email": "leannaortiz@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "ut",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-11-19T07:50:37.091 +08:00",
                    "updated_at": "2013-03-19T08:21:51.894 +07:00"
                },
                "created_at": "2012-05-04T04:44:50.429 +07:00",
                "created_by": {
                    "id": 6,
                    "uuid": "9f0c9eb5-41f6-446a-abc4-b094587c80bb",
                    "name": "Diaz Ford",
                    "slug": "diaz-ford",
                    "email": "diazford@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "consectetur enim nulla",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-02-08T13:01:28.049 +08:00",
                    "updated_at": "2013-07-22T22:40:25.119 +07:00"
                },
                "updated_at": "2013-10-06T07:30:20.590 +07:00",
                "updated_by": {
                    "id": 8,
                    "uuid": "5ffd3d4d-75d6-42a6-8989-05315e555088",
                    "name": "Rowena Gilliam",
                    "slug": "rowena-gilliam",
                    "email": "rowenagilliam@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "id",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-12-30T17:02:31.990 +08:00",
                    "updated_at": "2013-03-19T19:50:16.642 +07:00"
                },
                "published_at": "2013-11-28T11:02:37.808 +08:00",
                "published_by": {
                    "id": 2,
                    "uuid": "041c9d67-7eb5-4825-a625-440cb7ffee0b",
                    "name": "Mayer Whitney",
                    "slug": "mayer-whitney",
                    "email": "mayerwhitney@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "nostrud laborum",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-14T07:00:48.331 +07:00",
                    "updated_at": "2013-08-26T06:59:18.109 +07:00"
                },
                "tags": [
                    {
                        "id": 31,
                        "uuid": "52eb3df3-b04d-464c-ad07-0876f0401246",
                        "name": "exercitation occaecat",
                        "slug": "exercitation-occaecat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-08-23T03:59:21.083 +07:00",
                        "created_by": 1,
                        "updated_at": "2012-07-21T01:20:10.627 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 45,
                        "uuid": "a760be78-1088-433a-935e-ee940449dd8c",
                        "name": "nulla",
                        "slug": "nulla",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-10-31T11:38:21.298 +07:00",
                        "created_by": 1,
                        "updated_at": "2012-04-15T19:56:16.418 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 94,
                        "uuid": "efa62805-0408-44a9-9490-a7cd4325f957",
                        "name": "sunt",
                        "slug": "sunt",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-02-01T08:39:29.136 +08:00",
                        "created_by": 5,
                        "updated_at": "2012-10-08T02:43:19.794 +07:00",
                        "updated_by": 6
                    }
                ]
            },
            {
                "id": 26,
                "uuid": "7794be5c-2f36-495f-8285-01cf5392362a",
                "status": "draft",
                "title": "magna excepteur nulla nulla magna enim ex",
                "slug": "magna-excepteur-nulla-nulla-magna-enim-ex",
                "markdown": "Culpa amet qui cupidatat ea ea. Commodo nulla velit mollit officia incididunt eu ullamco do non ullamco. Incididunt nulla tempor quis deserunt enim dolor aliqua est ullamco excepteur proident excepteur consequat aliquip. Ea excepteur est do magna. Cupidatat ea nostrud consequat culpa voluptate. Elit voluptate consectetur laborum ullamco occaecat minim nostrud cillum elit minim ut minim cillum.\r\nIrure veniam duis consectetur labore nulla nostrud ullamco. Culpa et ea cillum non non commodo fugiat eiusmod occaecat exercitation eu mollit ullamco aute. Cillum consequat enim amet ad ex. Veniam consequat irure fugiat cillum.\r\nVoluptate ad consequat esse tempor fugiat voluptate commodo elit tempor elit culpa. Ut aliqua mollit sit eu cillum adipisicing adipisicing qui. Ut tempor exercitation eiusmod est aute nostrud reprehenderit ut nostrud aute esse velit labore ex. Quis mollit ad proident dolore. Cupidatat anim ad nostrud cupidatat aliquip laborum deserunt dolore adipisicing laboris excepteur ullamco culpa nulla.\r\nAnim labore proident mollit ea ut et aliqua eiusmod sint commodo nostrud. Consectetur nisi labore ex ut officia ullamco et ad nisi laboris eiusmod do est consectetur. Labore et fugiat in aliquip.\r\nFugiat sit labore dolor eiusmod cillum occaecat consectetur sit exercitation eiusmod dolor. Sint adipisicing incididunt non veniam eiusmod eu sunt ex ea. Minim deserunt esse reprehenderit nulla nisi esse cillum incididunt eu occaecat incididunt labore dolor do. Proident ullamco sit proident deserunt in deserunt culpa deserunt irure nulla ad. Ut aliqua sint aute dolor enim quis ullamco labore qui occaecat Lorem. Et ad exercitation ipsum deserunt quis cupidatat culpa duis adipisicing laborum ad proident. Qui elit magna mollit esse labore tempor.\r\n",
                "html": "<p>Culpa amet qui cupidatat ea ea. Commodo nulla velit mollit officia incididunt eu ullamco do non ullamco. Incididunt nulla tempor quis deserunt enim dolor aliqua est ullamco excepteur proident excepteur consequat aliquip. Ea excepteur est do magna. Cupidatat ea nostrud consequat culpa voluptate. Elit voluptate consectetur laborum ullamco occaecat minim nostrud cillum elit minim ut minim cillum.\r\nIrure veniam duis consectetur labore nulla nostrud ullamco. Culpa et ea cillum non non commodo fugiat eiusmod occaecat exercitation eu mollit ullamco aute. Cillum consequat enim amet ad ex. Veniam consequat irure fugiat cillum.\r\nVoluptate ad consequat esse tempor fugiat voluptate commodo elit tempor elit culpa. Ut aliqua mollit sit eu cillum adipisicing adipisicing qui. Ut tempor exercitation eiusmod est aute nostrud reprehenderit ut nostrud aute esse velit labore ex. Quis mollit ad proident dolore. Cupidatat anim ad nostrud cupidatat aliquip laborum deserunt dolore adipisicing laboris excepteur ullamco culpa nulla.\r\nAnim labore proident mollit ea ut et aliqua eiusmod sint commodo nostrud. Consectetur nisi labore ex ut officia ullamco et ad nisi laboris eiusmod do est consectetur. Labore et fugiat in aliquip.\r\nFugiat sit labore dolor eiusmod cillum occaecat consectetur sit exercitation eiusmod dolor. Sint adipisicing incididunt non veniam eiusmod eu sunt ex ea. Minim deserunt esse reprehenderit nulla nisi esse cillum incididunt eu occaecat incididunt labore dolor do. Proident ullamco sit proident deserunt in deserunt culpa deserunt irure nulla ad. Ut aliqua sint aute dolor enim quis ullamco labore qui occaecat Lorem. Et ad exercitation ipsum deserunt quis cupidatat culpa duis adipisicing laborum ad proident. Qui elit magna mollit esse labore tempor.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 5,
                    "uuid": "d2adbee4-2adc-4ed7-8da5-7e81a892cab5",
                    "name": "Jami Christensen",
                    "slug": "jami-christensen",
                    "email": "jamichristensen@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "veniam",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-04-30T22:45:48.691 +07:00",
                    "updated_at": "2012-06-22T15:30:29.534 +07:00"
                },
                "created_at": "2014-03-26T01:56:12.044 +07:00",
                "created_by": {
                    "id": 1,
                    "uuid": "db52a16d-6f2a-429c-a989-228924dc5579",
                    "name": "Riggs Hardy",
                    "slug": "riggs-hardy",
                    "email": "riggshardy@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "aliquip",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-09-30T03:53:19.750 +07:00",
                    "updated_at": "2012-02-09T10:23:30.925 +08:00"
                },
                "updated_at": "2012-04-21T22:37:46.110 +07:00",
                "updated_by": {
                    "id": 3,
                    "uuid": "d0d8b3d5-65a2-49a0-84ab-8d442227caad",
                    "name": "Blackwell Allen",
                    "slug": "blackwell-allen",
                    "email": "blackwellallen@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "aute cupidatat",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-12T01:36:16.331 +07:00",
                    "updated_at": "2012-09-10T22:15:54.611 +07:00"
                },
                "published_at": "2013-04-26T23:22:11.162 +07:00",
                "published_by": {
                    "id": 2,
                    "uuid": "5fffdf1c-7ea0-41dd-b732-30e6833277ce",
                    "name": "Holt Trujillo",
                    "slug": "holt-trujillo",
                    "email": "holttrujillo@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "culpa",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-12-01T07:56:52.953 +08:00",
                    "updated_at": "2013-01-30T15:04:44.448 +08:00"
                },
                "tags": [
                    {
                        "id": 63,
                        "uuid": "b6819aac-6ff4-48c0-936f-a43e0effb509",
                        "name": "non",
                        "slug": "non",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-26T04:41:59.122 +07:00",
                        "created_by": 4,
                        "updated_at": "2012-12-14T15:41:25.279 +08:00",
                        "updated_by": 0
                    },
                    {
                        "id": 41,
                        "uuid": "812f82f9-79fe-4542-a645-d3eaa8bfb63b",
                        "name": "proident",
                        "slug": "proident",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-05-01T15:16:20.886 +07:00",
                        "created_by": 7,
                        "updated_at": "2012-02-12T19:24:02.008 +08:00",
                        "updated_by": 7
                    },
                    {
                        "id": 98,
                        "uuid": "05ab8d90-2943-4a71-8588-b2700d88e2a6",
                        "name": "veniam minim esse",
                        "slug": "veniam-minim-esse",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-06-25T22:12:03.304 +07:00",
                        "created_by": 10,
                        "updated_at": "2012-03-23T18:14:31.876 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 57,
                        "uuid": "989e5ffd-3201-4270-bbea-f2e6b277632f",
                        "name": "laboris",
                        "slug": "laboris",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-12T14:15:34.707 +07:00",
                        "created_by": 3,
                        "updated_at": "2012-03-24T22:32:01.225 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 37,
                        "uuid": "b98f2f0e-71eb-4e5a-a145-838c9a99d783",
                        "name": "consectetur",
                        "slug": "consectetur",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-02-22T12:07:37.450 +08:00",
                        "created_by": 6,
                        "updated_at": "2014-02-04T03:36:33.905 +08:00",
                        "updated_by": 6
                    }
                ]
            },
            {
                "id": 27,
                "uuid": "7d346309-9353-4220-88f5-3a6b4d882329",
                "status": "draft",
                "title": "quis exercitation cillum commodo proident labore mollit cupidatat non id",
                "slug": "quis-exercitation-cillum-commodo-proident-labore-mollit-cupidatat-non-id",
                "markdown": "Amet elit mollit ullamco veniam voluptate est in nulla quis. Ipsum aliquip tempor officia fugiat Lorem ad velit laboris qui. Sint excepteur excepteur fugiat qui ex ullamco sint dolore voluptate. Aliquip pariatur exercitation ex elit Lorem proident irure eu.\r\nNisi minim reprehenderit mollit reprehenderit ad consequat labore ex consequat voluptate velit ad. Cupidatat reprehenderit mollit adipisicing proident proident esse nulla. Aute duis labore elit sunt culpa adipisicing anim nisi culpa proident. Consequat est pariatur Lorem laboris incididunt id veniam mollit est occaecat. Commodo nulla aute eu anim ad eiusmod excepteur ea est nulla consequat eiusmod. Labore tempor nulla est ea Lorem minim. Sit sunt id occaecat fugiat dolor.\r\nVelit sit excepteur magna deserunt quis ad. Cupidatat esse commodo voluptate laborum sint et nisi proident deserunt minim qui adipisicing occaecat. Velit nisi commodo ea ad duis do quis nulla occaecat enim quis cupidatat nisi. Incididunt qui ea minim anim duis laboris quis. Cillum velit do exercitation pariatur aute qui officia laboris nostrud duis et.\r\nNon cupidatat cillum in mollit. Pariatur eiusmod sit eiusmod ut ad voluptate in commodo ipsum. Fugiat deserunt tempor culpa deserunt velit eu aute ad voluptate.\r\nNostrud amet irure ipsum aliqua. Incididunt qui adipisicing proident deserunt proident occaecat proident aliquip eu esse duis pariatur nostrud. Irure adipisicing voluptate dolor ipsum quis cillum duis ut sint deserunt sit excepteur non fugiat. Ipsum Lorem incididunt eu ex Lorem cupidatat.\r\nCommodo pariatur reprehenderit aliquip tempor minim laboris occaecat veniam. Duis voluptate duis labore velit culpa in laboris ea ut tempor ex ad pariatur consectetur. Excepteur est voluptate ullamco occaecat fugiat dolore culpa nulla magna.\r\nLaboris nulla ut magna dolore fugiat magna ea sunt aute labore fugiat. Eu ad culpa Lorem pariatur occaecat aliquip Lorem ut qui esse consectetur elit eu. Exercitation non proident id tempor labore fugiat officia veniam dolore qui nulla in proident.\r\n",
                "html": "<p>Amet elit mollit ullamco veniam voluptate est in nulla quis. Ipsum aliquip tempor officia fugiat Lorem ad velit laboris qui. Sint excepteur excepteur fugiat qui ex ullamco sint dolore voluptate. Aliquip pariatur exercitation ex elit Lorem proident irure eu.\r\nNisi minim reprehenderit mollit reprehenderit ad consequat labore ex consequat voluptate velit ad. Cupidatat reprehenderit mollit adipisicing proident proident esse nulla. Aute duis labore elit sunt culpa adipisicing anim nisi culpa proident. Consequat est pariatur Lorem laboris incididunt id veniam mollit est occaecat. Commodo nulla aute eu anim ad eiusmod excepteur ea est nulla consequat eiusmod. Labore tempor nulla est ea Lorem minim. Sit sunt id occaecat fugiat dolor.\r\nVelit sit excepteur magna deserunt quis ad. Cupidatat esse commodo voluptate laborum sint et nisi proident deserunt minim qui adipisicing occaecat. Velit nisi commodo ea ad duis do quis nulla occaecat enim quis cupidatat nisi. Incididunt qui ea minim anim duis laboris quis. Cillum velit do exercitation pariatur aute qui officia laboris nostrud duis et.\r\nNon cupidatat cillum in mollit. Pariatur eiusmod sit eiusmod ut ad voluptate in commodo ipsum. Fugiat deserunt tempor culpa deserunt velit eu aute ad voluptate.\r\nNostrud amet irure ipsum aliqua. Incididunt qui adipisicing proident deserunt proident occaecat proident aliquip eu esse duis pariatur nostrud. Irure adipisicing voluptate dolor ipsum quis cillum duis ut sint deserunt sit excepteur non fugiat. Ipsum Lorem incididunt eu ex Lorem cupidatat.\r\nCommodo pariatur reprehenderit aliquip tempor minim laboris occaecat veniam. Duis voluptate duis labore velit culpa in laboris ea ut tempor ex ad pariatur consectetur. Excepteur est voluptate ullamco occaecat fugiat dolore culpa nulla magna.\r\nLaboris nulla ut magna dolore fugiat magna ea sunt aute labore fugiat. Eu ad culpa Lorem pariatur occaecat aliquip Lorem ut qui esse consectetur elit eu. Exercitation non proident id tempor labore fugiat officia veniam dolore qui nulla in proident.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 2,
                    "uuid": "086cf79c-282c-43d3-b9b3-9de681e7a055",
                    "name": "Finch Gonzales",
                    "slug": "finch-gonzales",
                    "email": "finchgonzales@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "quis",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-10-04T09:56:26.236 +07:00",
                    "updated_at": "2013-01-03T12:55:27.585 +08:00"
                },
                "created_at": "2013-02-25T12:58:37.628 +08:00",
                "created_by": {
                    "id": 10,
                    "uuid": "ae4da738-2015-496d-8ba6-93244fc3838b",
                    "name": "Leslie Walsh",
                    "slug": "leslie-walsh",
                    "email": "lesliewalsh@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "nisi est",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-08-23T09:57:37.340 +07:00",
                    "updated_at": "2012-10-26T05:38:38.131 +07:00"
                },
                "updated_at": "2013-04-15T01:21:45.401 +07:00",
                "updated_by": {
                    "id": 10,
                    "uuid": "a068fcf0-293d-443b-ad6d-c8358756d1e0",
                    "name": "Howe Jarvis",
                    "slug": "howe-jarvis",
                    "email": "howejarvis@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "aliqua aute",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-02-25T11:56:37.639 +08:00",
                    "updated_at": "2013-07-30T04:32:20.450 +07:00"
                },
                "published_at": "2014-03-07T03:07:20.141 +08:00",
                "published_by": {
                    "id": 1,
                    "uuid": "a160fd6d-fdf8-400a-a6e3-e340ee164438",
                    "name": "Alvarado Duran",
                    "slug": "alvarado-duran",
                    "email": "alvaradoduran@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "deserunt velit enim",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-08-19T08:08:47.813 +07:00",
                    "updated_at": "2012-01-13T11:31:56.820 +08:00"
                },
                "tags": [
                    {
                        "id": 5,
                        "uuid": "49d1f092-a456-4a3a-9dd1-9d466f6f7343",
                        "name": "quis non deserunt",
                        "slug": "quis-non-deserunt",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-07-09T00:53:34.715 +07:00",
                        "created_by": 2,
                        "updated_at": "2012-05-19T15:50:53.212 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 5,
                        "uuid": "8f861c97-76b2-4077-b397-3f0743413b38",
                        "name": "tempor consequat officia",
                        "slug": "tempor-consequat-officia",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-06T15:01:15.834 +07:00",
                        "created_by": 7,
                        "updated_at": "2013-09-11T17:48:41.183 +07:00",
                        "updated_by": 1
                    },
                    {
                        "id": 71,
                        "uuid": "56e1a9c6-53d8-4cd0-99db-2a4b77047f8f",
                        "name": "veniam",
                        "slug": "veniam",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-15T10:48:39.758 +08:00",
                        "created_by": 4,
                        "updated_at": "2012-08-16T17:59:22.808 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 39,
                        "uuid": "0e6a303f-3ac0-48cc-bd54-906c4f09abfe",
                        "name": "irure dolor aute",
                        "slug": "irure-dolor-aute",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-10-22T17:47:47.585 +07:00",
                        "created_by": 3,
                        "updated_at": "2013-02-02T02:46:00.907 +08:00",
                        "updated_by": 7
                    },
                    {
                        "id": 85,
                        "uuid": "3ce1c0d9-2b3d-4686-b8ba-acedf8fa908c",
                        "name": "nostrud exercitation deserunt",
                        "slug": "nostrud-exercitation-deserunt",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-12-31T05:46:58.851 +08:00",
                        "created_by": 6,
                        "updated_at": "2014-01-01T23:21:28.204 +08:00",
                        "updated_by": 4
                    },
                    {
                        "id": 45,
                        "uuid": "51679786-b283-430d-82af-17c42bef81b8",
                        "name": "et pariatur nostrud",
                        "slug": "et-pariatur-nostrud",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-03-30T18:07:02.366 +07:00",
                        "created_by": 8,
                        "updated_at": "2014-01-29T17:43:25.649 +08:00",
                        "updated_by": 7
                    },
                    {
                        "id": 95,
                        "uuid": "9e4aa3b9-9a7b-496e-880e-8558480402f1",
                        "name": "velit exercitation ad",
                        "slug": "velit-exercitation-ad",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-10-21T04:41:30.521 +07:00",
                        "created_by": 10,
                        "updated_at": "2013-09-13T06:26:29.446 +07:00",
                        "updated_by": 0
                    },
                    {
                        "id": 84,
                        "uuid": "4030b66a-0e53-4653-9a70-60bc2a51c85b",
                        "name": "consectetur",
                        "slug": "consectetur",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-06-24T05:49:11.895 +07:00",
                        "created_by": 3,
                        "updated_at": "2012-03-26T23:16:31.132 +07:00",
                        "updated_by": 7
                    },
                    {
                        "id": 39,
                        "uuid": "52f8e1d6-5051-4a47-bf9c-7ebb68891554",
                        "name": "cupidatat commodo",
                        "slug": "cupidatat-commodo",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-20T04:20:47.779 +07:00",
                        "created_by": 8,
                        "updated_at": "2014-03-19T16:04:47.980 +07:00",
                        "updated_by": 3
                    }
                ]
            },
            {
                "id": 28,
                "uuid": "53655ad7-2c04-4175-9bab-9394ac7b52e8",
                "status": "published",
                "title": "dolor mollit nisi id veniam commodo Lorem voluptate aliqua do",
                "slug": "dolor-mollit-nisi-id-veniam-commodo-Lorem-voluptate-aliqua-do",
                "markdown": "Incididunt nisi minim aute dolor sunt excepteur consectetur ullamco sit fugiat occaecat irure. Culpa quis aliqua dolor sunt laboris magna mollit occaecat. Cillum est incididunt sint magna excepteur reprehenderit ea ut est pariatur mollit amet reprehenderit. Commodo non est quis occaecat sunt eu ullamco labore quis. Laboris consequat anim velit amet.\r\nProident et reprehenderit Lorem irure aliquip velit laborum amet eu velit. Cillum eiusmod minim nostrud Lorem occaecat irure consequat reprehenderit enim ullamco labore duis cupidatat. Id laboris fugiat proident velit incididunt nulla do nisi id excepteur elit.\r\nNon eiusmod proident sit cillum mollit sit amet. Incididunt deserunt ipsum laborum voluptate non magna magna dolore cillum cupidatat incididunt et. Minim Lorem cillum est aliqua. Et amet reprehenderit pariatur incididunt consectetur duis fugiat. Qui reprehenderit non velit eiusmod ipsum Lorem occaecat nostrud ad elit occaecat laborum aliquip laboris.\r\nMinim esse laborum commodo deserunt elit qui aliqua ex cillum occaecat ut. Magna adipisicing ex voluptate culpa duis. Officia commodo in sunt adipisicing. Ex ut id fugiat in anim. Cillum duis adipisicing quis est incididunt deserunt eu nisi aute veniam voluptate irure do in. Exercitation magna proident sit reprehenderit ex labore labore ea consectetur sit minim occaecat voluptate eu.\r\nDo magna id ea deserunt Lorem labore laborum est Lorem est nostrud consectetur in. Pariatur ipsum culpa aute voluptate voluptate adipisicing ad reprehenderit aliquip. Nulla exercitation pariatur sit esse nostrud cillum ipsum laboris dolore sunt dolor. Duis dolore labore eiusmod pariatur velit adipisicing ex aliquip exercitation ipsum veniam. Minim do officia duis Lorem anim id do esse sunt. Lorem elit laborum esse velit amet laborum culpa id occaecat quis commodo consectetur cillum adipisicing.\r\nLaboris Lorem consequat consectetur pariatur fugiat excepteur sint qui. Cillum pariatur nulla labore nisi cupidatat. Aliquip nisi id voluptate reprehenderit qui do occaecat in fugiat elit exercitation culpa qui fugiat.\r\nEsse anim occaecat eiusmod qui voluptate. Elit ipsum do ut officia cupidatat dolor nulla ad laborum in et commodo. Duis aliquip minim excepteur Lorem fugiat excepteur do consequat sunt consequat incididunt. Velit mollit fugiat eiusmod amet magna.\r\nIrure ipsum labore cupidatat eu esse reprehenderit aliquip pariatur dolore officia pariatur deserunt qui. Minim consequat commodo voluptate culpa dolore. Incididunt irure voluptate commodo pariatur Lorem aute do cupidatat aliquip.\r\nIn deserunt minim nulla et nulla. Amet in ut in amet esse reprehenderit nostrud deserunt ullamco ad. Voluptate nisi dolore veniam laboris tempor incididunt. Culpa do esse non non veniam incididunt non ad nulla non cillum nulla consequat consequat. Sunt eiusmod elit nostrud minim. Ullamco amet sint ea eiusmod reprehenderit. Fugiat ut voluptate eu cillum minim sint nulla do irure adipisicing.\r\nCupidatat mollit sit sunt officia excepteur cillum laboris labore eiusmod anim sunt officia mollit exercitation. Eu eiusmod voluptate pariatur ut qui amet ullamco nulla elit veniam irure. Tempor do quis voluptate mollit. Esse eiusmod qui do est nisi commodo sit.\r\n",
                "html": "<p>Incididunt nisi minim aute dolor sunt excepteur consectetur ullamco sit fugiat occaecat irure. Culpa quis aliqua dolor sunt laboris magna mollit occaecat. Cillum est incididunt sint magna excepteur reprehenderit ea ut est pariatur mollit amet reprehenderit. Commodo non est quis occaecat sunt eu ullamco labore quis. Laboris consequat anim velit amet.\r\nProident et reprehenderit Lorem irure aliquip velit laborum amet eu velit. Cillum eiusmod minim nostrud Lorem occaecat irure consequat reprehenderit enim ullamco labore duis cupidatat. Id laboris fugiat proident velit incididunt nulla do nisi id excepteur elit.\r\nNon eiusmod proident sit cillum mollit sit amet. Incididunt deserunt ipsum laborum voluptate non magna magna dolore cillum cupidatat incididunt et. Minim Lorem cillum est aliqua. Et amet reprehenderit pariatur incididunt consectetur duis fugiat. Qui reprehenderit non velit eiusmod ipsum Lorem occaecat nostrud ad elit occaecat laborum aliquip laboris.\r\nMinim esse laborum commodo deserunt elit qui aliqua ex cillum occaecat ut. Magna adipisicing ex voluptate culpa duis. Officia commodo in sunt adipisicing. Ex ut id fugiat in anim. Cillum duis adipisicing quis est incididunt deserunt eu nisi aute veniam voluptate irure do in. Exercitation magna proident sit reprehenderit ex labore labore ea consectetur sit minim occaecat voluptate eu.\r\nDo magna id ea deserunt Lorem labore laborum est Lorem est nostrud consectetur in. Pariatur ipsum culpa aute voluptate voluptate adipisicing ad reprehenderit aliquip. Nulla exercitation pariatur sit esse nostrud cillum ipsum laboris dolore sunt dolor. Duis dolore labore eiusmod pariatur velit adipisicing ex aliquip exercitation ipsum veniam. Minim do officia duis Lorem anim id do esse sunt. Lorem elit laborum esse velit amet laborum culpa id occaecat quis commodo consectetur cillum adipisicing.\r\nLaboris Lorem consequat consectetur pariatur fugiat excepteur sint qui. Cillum pariatur nulla labore nisi cupidatat. Aliquip nisi id voluptate reprehenderit qui do occaecat in fugiat elit exercitation culpa qui fugiat.\r\nEsse anim occaecat eiusmod qui voluptate. Elit ipsum do ut officia cupidatat dolor nulla ad laborum in et commodo. Duis aliquip minim excepteur Lorem fugiat excepteur do consequat sunt consequat incididunt. Velit mollit fugiat eiusmod amet magna.\r\nIrure ipsum labore cupidatat eu esse reprehenderit aliquip pariatur dolore officia pariatur deserunt qui. Minim consequat commodo voluptate culpa dolore. Incididunt irure voluptate commodo pariatur Lorem aute do cupidatat aliquip.\r\nIn deserunt minim nulla et nulla. Amet in ut in amet esse reprehenderit nostrud deserunt ullamco ad. Voluptate nisi dolore veniam laboris tempor incididunt. Culpa do esse non non veniam incididunt non ad nulla non cillum nulla consequat consequat. Sunt eiusmod elit nostrud minim. Ullamco amet sint ea eiusmod reprehenderit. Fugiat ut voluptate eu cillum minim sint nulla do irure adipisicing.\r\nCupidatat mollit sit sunt officia excepteur cillum laboris labore eiusmod anim sunt officia mollit exercitation. Eu eiusmod voluptate pariatur ut qui amet ullamco nulla elit veniam irure. Tempor do quis voluptate mollit. Esse eiusmod qui do est nisi commodo sit.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 1,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 5,
                    "uuid": "3f4efd06-8dc5-4982-a354-a5022c0f5b3a",
                    "name": "Love Frank",
                    "slug": "love-frank",
                    "email": "lovefrank@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "elit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-07-06T22:34:27.651 +07:00",
                    "updated_at": "2013-03-04T06:08:55.684 +08:00"
                },
                "created_at": "2013-02-14T04:35:15.522 +08:00",
                "created_by": {
                    "id": 1,
                    "uuid": "9360f2b4-8b63-4486-b49d-8c597ef1cce0",
                    "name": "Maddox Mcintyre",
                    "slug": "maddox-mcintyre",
                    "email": "maddoxmcintyre@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "enim esse elit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-09-01T13:49:28.024 +07:00",
                    "updated_at": "2013-06-12T04:14:53.850 +07:00"
                },
                "updated_at": "2013-06-08T18:19:35.962 +07:00",
                "updated_by": {
                    "id": 5,
                    "uuid": "6fcc128f-5167-4820-b086-625db6c85560",
                    "name": "Hancock Mccray",
                    "slug": "hancock-mccray",
                    "email": "hancockmccray@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "veniam dolore",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-10-22T19:06:16.836 +07:00",
                    "updated_at": "2014-05-13T17:42:41.559 +07:00"
                },
                "published_at": "2012-02-01T18:02:06.007 +08:00",
                "published_by": {
                    "id": 6,
                    "uuid": "66b426cc-4fb7-4ee1-8bc4-01aace714e61",
                    "name": "Tracy Pennington",
                    "slug": "tracy-pennington",
                    "email": "tracypennington@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "dolor nostrud eiusmod",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-27T13:12:47.474 +07:00",
                    "updated_at": "2013-11-05T15:46:35.056 +08:00"
                },
                "tags": [
                    {
                        "id": 33,
                        "uuid": "7dc4e899-d234-4657-b057-bd3d1c7fd4d8",
                        "name": "culpa cillum sint",
                        "slug": "culpa-cillum-sint",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-11-04T02:52:46.878 +08:00",
                        "created_by": 6,
                        "updated_at": "2012-04-06T09:44:29.809 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 6,
                        "uuid": "7b8edba9-9f9b-47dd-904b-00e19ff9e0cd",
                        "name": "quis tempor",
                        "slug": "quis-tempor",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-10-23T16:11:59.919 +07:00",
                        "created_by": 6,
                        "updated_at": "2013-12-16T14:10:06.213 +08:00",
                        "updated_by": 0
                    },
                    {
                        "id": 54,
                        "uuid": "7af16124-9a8b-46e9-ab64-3f6821917665",
                        "name": "aute adipisicing est",
                        "slug": "aute-adipisicing-est",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-12-05T23:26:46.451 +08:00",
                        "created_by": 0,
                        "updated_at": "2012-06-07T07:28:28.066 +07:00",
                        "updated_by": 4
                    },
                    {
                        "id": 100,
                        "uuid": "0d2950a0-e8be-4d83-9a51-b0204a2e1389",
                        "name": "quis amet duis",
                        "slug": "quis-amet-duis",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-04-06T12:06:46.179 +07:00",
                        "created_by": 10,
                        "updated_at": "2012-08-03T19:02:03.123 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 78,
                        "uuid": "2b2885b4-36ad-41bc-8c12-f792beb05612",
                        "name": "aliquip eu dolore",
                        "slug": "aliquip-eu-dolore",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-01-11T06:24:27.867 +08:00",
                        "created_by": 5,
                        "updated_at": "2012-09-18T22:00:53.820 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 37,
                        "uuid": "1a1521f3-b77b-40ee-9ac0-57810c832add",
                        "name": "fugiat aliqua",
                        "slug": "fugiat-aliqua",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-08-13T00:18:56.360 +07:00",
                        "created_by": 2,
                        "updated_at": "2014-03-02T17:47:37.872 +08:00",
                        "updated_by": 2
                    }
                ]
            },
            {
                "id": 29,
                "uuid": "cca7c55e-a02d-474b-a5e6-6afb3927c8e8",
                "status": "published",
                "title": "eiusmod eu",
                "slug": "eiusmod-eu",
                "markdown": "Dolor enim voluptate nulla cupidatat excepteur cillum duis magna ipsum. Est occaecat elit incididunt ad labore aliqua ea nulla adipisicing. Culpa adipisicing mollit minim aliqua pariatur nulla aliqua. Veniam commodo non incididunt duis sit sunt irure consequat nulla amet magna duis.\r\nReprehenderit adipisicing officia dolor adipisicing sit duis laboris nostrud ea esse consequat. Eiusmod enim est eu do do aliquip. Fugiat anim veniam adipisicing proident. Do do sit adipisicing sunt culpa nisi commodo enim. Aute pariatur eu adipisicing aliquip sint deserunt esse cillum eu amet non dolore proident. Reprehenderit aute elit ullamco ut laboris ex veniam magna culpa ad labore. Elit culpa laborum excepteur irure ex deserunt fugiat Lorem eiusmod sit aliquip excepteur.\r\nDeserunt laboris aliqua adipisicing nisi elit fugiat duis irure ex et ad ea consequat. Incididunt aute duis sunt sit nulla sunt. Incididunt anim reprehenderit magna id veniam laboris. Deserunt sit nisi nostrud dolor enim quis commodo ea.\r\nEnim reprehenderit amet enim esse incididunt ex nisi irure anim fugiat minim enim excepteur. Anim minim ut magna ut dolore ut quis id. Elit do incididunt veniam adipisicing reprehenderit nisi culpa duis. Sint dolor exercitation reprehenderit laborum velit duis sunt culpa. Irure adipisicing aliquip incididunt nisi tempor cupidatat quis magna velit. Ut pariatur commodo aliqua enim Lorem officia Lorem ex reprehenderit anim consequat sit.\r\nQuis id et consectetur occaecat occaecat enim sint esse sunt duis. Amet exercitation dolore magna Lorem. Fugiat labore anim ipsum do incididunt. Non nisi aliqua occaecat sit reprehenderit veniam veniam consequat eu commodo et id deserunt consequat. Qui qui reprehenderit sunt aliquip.\r\n",
                "html": "<p>Dolor enim voluptate nulla cupidatat excepteur cillum duis magna ipsum. Est occaecat elit incididunt ad labore aliqua ea nulla adipisicing. Culpa adipisicing mollit minim aliqua pariatur nulla aliqua. Veniam commodo non incididunt duis sit sunt irure consequat nulla amet magna duis.\r\nReprehenderit adipisicing officia dolor adipisicing sit duis laboris nostrud ea esse consequat. Eiusmod enim est eu do do aliquip. Fugiat anim veniam adipisicing proident. Do do sit adipisicing sunt culpa nisi commodo enim. Aute pariatur eu adipisicing aliquip sint deserunt esse cillum eu amet non dolore proident. Reprehenderit aute elit ullamco ut laboris ex veniam magna culpa ad labore. Elit culpa laborum excepteur irure ex deserunt fugiat Lorem eiusmod sit aliquip excepteur.\r\nDeserunt laboris aliqua adipisicing nisi elit fugiat duis irure ex et ad ea consequat. Incididunt aute duis sunt sit nulla sunt. Incididunt anim reprehenderit magna id veniam laboris. Deserunt sit nisi nostrud dolor enim quis commodo ea.\r\nEnim reprehenderit amet enim esse incididunt ex nisi irure anim fugiat minim enim excepteur. Anim minim ut magna ut dolore ut quis id. Elit do incididunt veniam adipisicing reprehenderit nisi culpa duis. Sint dolor exercitation reprehenderit laborum velit duis sunt culpa. Irure adipisicing aliquip incididunt nisi tempor cupidatat quis magna velit. Ut pariatur commodo aliqua enim Lorem officia Lorem ex reprehenderit anim consequat sit.\r\nQuis id et consectetur occaecat occaecat enim sint esse sunt duis. Amet exercitation dolore magna Lorem. Fugiat labore anim ipsum do incididunt. Non nisi aliqua occaecat sit reprehenderit veniam veniam consequat eu commodo et id deserunt consequat. Qui qui reprehenderit sunt aliquip.\r\n</p>",
                "image": null,
                "featured": 1,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 8,
                    "uuid": "929b9238-d5a7-4c09-8e4f-28867dff1088",
                    "name": "Cameron Stuart",
                    "slug": "cameron-stuart",
                    "email": "cameronstuart@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "consequat mollit quis",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2014-05-06T00:52:54.103 +07:00",
                    "updated_at": "2012-06-01T21:01:10.741 +07:00"
                },
                "created_at": "2014-03-16T16:47:59.264 +07:00",
                "created_by": {
                    "id": 10,
                    "uuid": "335b38c4-370b-4900-a9a7-ab2d7bd4fe3c",
                    "name": "Ofelia Rocha",
                    "slug": "ofelia-rocha",
                    "email": "ofeliarocha@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "veniam",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-07-16T20:24:46.471 +07:00",
                    "updated_at": "2013-12-30T16:31:47.126 +08:00"
                },
                "updated_at": "2013-07-31T19:12:40.848 +07:00",
                "updated_by": {
                    "id": 9,
                    "uuid": "295bc79b-151a-4a66-8c43-e0d935f02300",
                    "name": "Wilkinson Lancaster",
                    "slug": "wilkinson-lancaster",
                    "email": "wilkinsonlancaster@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "esse ad et",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-12-01T14:22:30.485 +08:00",
                    "updated_at": "2012-03-16T05:16:35.507 +07:00"
                },
                "published_at": "2012-01-01T12:37:39.418 +08:00",
                "published_by": {
                    "id": 9,
                    "uuid": "09b83896-cc87-41f6-8f43-0a97ba7865d6",
                    "name": "Morgan Bond",
                    "slug": "morgan-bond",
                    "email": "morganbond@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "exercitation magna reprehenderit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-26T02:55:22.766 +07:00",
                    "updated_at": "2012-03-18T13:35:17.930 +07:00"
                },
                "tags": [
                    {
                        "id": 74,
                        "uuid": "703de86f-cc16-45ec-88d7-64db50b6af25",
                        "name": "magna",
                        "slug": "magna",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-08-13T00:45:46.021 +07:00",
                        "created_by": 2,
                        "updated_at": "2013-11-13T19:20:28.993 +08:00",
                        "updated_by": 9
                    }
                ]
            },
            {
                "id": 30,
                "uuid": "a588c5fe-b0b6-4dd9-a533-04e92f2c537d",
                "status": "published",
                "title": "enim qui excepteur nulla non",
                "slug": "enim-qui-excepteur-nulla-non",
                "markdown": "Pariatur ea mollit labore esse excepteur aliquip ad sit cillum laborum cillum. Laboris ut labore ipsum culpa eiusmod veniam aliquip tempor. Sit consequat veniam nostrud commodo incididunt pariatur ipsum. Consectetur tempor veniam est reprehenderit duis culpa excepteur amet voluptate sunt. Ipsum aliqua exercitation eiusmod labore incididunt dolore mollit duis. Magna exercitation aliqua id laboris quis sunt pariatur sint irure.\r\nIn pariatur officia excepteur non mollit eu amet ex ipsum. Quis pariatur velit qui fugiat. In qui irure non sunt sint. Dolore irure et laboris eu adipisicing ad amet eiusmod cillum proident culpa.\r\nVelit excepteur magna labore eiusmod tempor eiusmod consectetur laborum enim sit in proident. Excepteur elit elit esse commodo eiusmod sunt. Esse incididunt ad voluptate elit excepteur nostrud pariatur. Fugiat quis ut ipsum sint elit pariatur minim. Sit eu sint do fugiat anim incididunt fugiat aute enim enim.\r\n",
                "html": "<p>Pariatur ea mollit labore esse excepteur aliquip ad sit cillum laborum cillum. Laboris ut labore ipsum culpa eiusmod veniam aliquip tempor. Sit consequat veniam nostrud commodo incididunt pariatur ipsum. Consectetur tempor veniam est reprehenderit duis culpa excepteur amet voluptate sunt. Ipsum aliqua exercitation eiusmod labore incididunt dolore mollit duis. Magna exercitation aliqua id laboris quis sunt pariatur sint irure.\r\nIn pariatur officia excepteur non mollit eu amet ex ipsum. Quis pariatur velit qui fugiat. In qui irure non sunt sint. Dolore irure et laboris eu adipisicing ad amet eiusmod cillum proident culpa.\r\nVelit excepteur magna labore eiusmod tempor eiusmod consectetur laborum enim sit in proident. Excepteur elit elit esse commodo eiusmod sunt. Esse incididunt ad voluptate elit excepteur nostrud pariatur. Fugiat quis ut ipsum sint elit pariatur minim. Sit eu sint do fugiat anim incididunt fugiat aute enim enim.\r\n</p>",
                "image": null,
                "featured": 0,
                "page": 0,
                "language": "en_US",
                "meta_title": null,
                "meta_description": null,
                "author": {
                    "id": 3,
                    "uuid": "796d881d-966b-4e5e-bd2d-05a4eb2e653c",
                    "name": "Fischer Patel",
                    "slug": "fischer-patel",
                    "email": "fischerpatel@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "eiusmod",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-04-20T05:36:47.914 +07:00",
                    "updated_at": "2013-06-23T19:26:31.294 +07:00"
                },
                "created_at": "2013-05-18T01:24:17.040 +07:00",
                "created_by": {
                    "id": 9,
                    "uuid": "5d6caea2-ede2-4eff-a7e7-5ac303e78ef3",
                    "name": "Barbara Chambers",
                    "slug": "barbara-chambers",
                    "email": "barbarachambers@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "velit",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2012-03-09T09:52:17.239 +08:00",
                    "updated_at": "2013-11-28T03:02:19.222 +08:00"
                },
                "updated_at": "2012-01-10T03:32:07.880 +08:00",
                "updated_by": {
                    "id": 3,
                    "uuid": "7b6ae54e-165f-4700-a97f-64925b7c0202",
                    "name": "Hoover Rutledge",
                    "slug": "hoover-rutledge",
                    "email": "hooverrutledge@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "do aliquip deserunt",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-10-14T08:10:05.235 +07:00",
                    "updated_at": "2012-06-26T06:20:48.079 +07:00"
                },
                "published_at": "2013-04-22T19:57:49.282 +07:00",
                "published_by": {
                    "id": 5,
                    "uuid": "c9e5a5b3-6c22-4b2a-93b9-5de57bde719b",
                    "name": "Melisa Hartman",
                    "slug": "melisa-hartman",
                    "email": "melisahartman@ecrater.com",
                    "bio": "",
                    "website": "",
                    "location": "minim",
                    "status": "active",
                    "language": "en_US",
                    "created_at": "2013-07-26T22:13:09.604 +07:00",
                    "updated_at": "2013-10-28T17:19:45.353 +07:00"
                },
                "tags": [
                    {
                        "id": 65,
                        "uuid": "a06e12bd-6da4-44b2-b997-b3803e8e7402",
                        "name": "ad irure occaecat",
                        "slug": "ad-irure-occaecat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-12-01T21:00:05.643 +08:00",
                        "created_by": 0,
                        "updated_at": "2013-02-11T05:05:59.959 +08:00",
                        "updated_by": 4
                    },
                    {
                        "id": 74,
                        "uuid": "377f6564-98bc-4dc8-a0fc-5e0c3bf3de44",
                        "name": "cillum",
                        "slug": "cillum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-07-18T09:31:14.861 +07:00",
                        "created_by": 4,
                        "updated_at": "2013-06-30T06:41:31.442 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 63,
                        "uuid": "4ecfd6a5-f430-44d1-bcbc-270fe6136f3d",
                        "name": "nisi aliqua do",
                        "slug": "nisi-aliqua-do",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-08-28T10:49:20.187 +07:00",
                        "created_by": 4,
                        "updated_at": "2012-03-12T15:52:24.884 +07:00",
                        "updated_by": 6
                    },
                    {
                        "id": 82,
                        "uuid": "0b4c0c59-b99b-4c8b-89f1-8de207b39df5",
                        "name": "fugiat nostrud occaecat",
                        "slug": "fugiat-nostrud-occaecat",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-07-04T11:25:57.605 +07:00",
                        "created_by": 3,
                        "updated_at": "2013-10-10T20:47:32.374 +07:00",
                        "updated_by": 8
                    },
                    {
                        "id": 13,
                        "uuid": "ec95a956-605e-4636-b623-aaced8c98c6f",
                        "name": "aliqua do nisi",
                        "slug": "aliqua-do-nisi",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-03-29T00:11:50.059 +07:00",
                        "created_by": 5,
                        "updated_at": "2014-02-14T02:25:35.435 +08:00",
                        "updated_by": 6
                    },
                    {
                        "id": 61,
                        "uuid": "7aa6ba91-b5cb-482f-880e-05bb70463a70",
                        "name": "duis occaecat ipsum",
                        "slug": "duis-occaecat-ipsum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-11-14T21:01:55.070 +08:00",
                        "created_by": 8,
                        "updated_at": "2012-08-05T05:50:27.577 +07:00",
                        "updated_by": 9
                    },
                    {
                        "id": 36,
                        "uuid": "f88b75be-fbcc-4b10-9883-213fe074f934",
                        "name": "cillum cillum",
                        "slug": "cillum-cillum",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2013-01-29T01:55:15.583 +08:00",
                        "created_by": 1,
                        "updated_at": "2012-09-27T04:00:58.752 +07:00",
                        "updated_by": 8
                    },
                    {
                        "id": 33,
                        "uuid": "d60fbece-c161-4726-8fa8-dbe87e1b865d",
                        "name": "dolore Lorem",
                        "slug": "dolore-lorem",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2014-02-23T04:23:27.848 +08:00",
                        "created_by": 5,
                        "updated_at": "2014-04-11T13:49:48.386 +07:00",
                        "updated_by": 10
                    },
                    {
                        "id": 33,
                        "uuid": "7b8d717d-ec3a-4dac-aada-4b2266e68df9",
                        "name": "nulla reprehenderit ut",
                        "slug": "nulla-reprehenderit-ut",
                        "description": null,
                        "parent_id": null,
                        "meta_title": null,
                        "meta_description": null,
                        "created_at": "2012-03-20T08:05:50.767 +07:00",
                        "created_by": 3,
                        "updated_at": "2013-09-30T00:01:13.417 +07:00",
                        "updated_by": 8
                    }
                ]
            }
        ];

    __exports__["default"] = posts;
    /* jshint ignore:end */
  });
define("ghost/fixtures/settings", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* jshint ignore:start */
    var settings = {
        "title": "Ghost",
        "description": "Just a blogging platform.",
        "email": "ghost@tryghost.org",
        "logo": "http://media-cache-ec0.pinimg.com/236x/be/35/06/be35065e6f9a613d4a7661a6f45d0831.jpg",
        "cover": "http://i906.photobucket.com/albums/ac267/df853/bring_me_a_shrubbery_cat.jpg",
        "defaultLang": "en_US",
        "postsPerPage": "6",
        "forceI18n": "true",
        "permalinks": "/:slug/",
        "activeTheme": "casper",
        "activeApps": "[]",
        "installedApps": "[]",
        "availableThemes": [
            {
                "name": "casper",
                "package": false,
                "active": true
            }
        ],
        "availableApps": []
    };

    __exports__["default"] = settings;
    /* jshint ignore:end */
  });
define("ghost/fixtures/users", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* jshint ignore:start */
    var users = [
        {
            "id": 1,
            "uuid": "ba9c67e4-8046-4b8c-9349-0eed3cca7529",
            "name": "some-user",
            "slug": "some-user",
            "email": "some@email.com",
            "image": undefined,
            "cover": undefined,
            "bio": "Example bio",
            "website": "",
            "location": "Imaginationland",
            "accessibility": undefined,
            "status": "active",
            "language": "en_US",
            "meta_title": undefined,
            "meta_description": undefined,
            "created_at": "2014-02-15T20:02:25.000Z",
            "updated_at": "2014-03-11T14:06:43.000Z"
        }
    ];

    __exports__["default"] = users;
    /* jshint ignore:end */
  });
define("ghost/helpers/gh-count-characters", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var countCharacters = Ember.Handlebars.makeBoundHelper(function (content) {
        var el = document.createElement('span'),
            length = content ? content.length : 0;

        el.className = 'word-count';
        if (length > 180) {
            el.style.color = '#E25440';
        } else {
            el.style.color = '#9E9D95';
        }

        el.innerHTML = 200 - length;

        return new Ember.Handlebars.SafeString(el.outerHTML);
    });

    __exports__["default"] = countCharacters;
  });
define("ghost/helpers/gh-count-words", 
  ["ghost/utils/word-count","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var counter = __dependency1__["default"];

    var countWords = Ember.Handlebars.makeBoundHelper(function (markdown) {
        if (/^\s*$/.test(markdown)) {
            return '0 words';
        }

        var count = counter(markdown || '');
        return count + (count === 1 ? ' word' : ' words');
    });

    __exports__["default"] = countWords;
  });
define("ghost/helpers/gh-format-markdown", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global Showdown, Handlebars */
    var showdown = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm']});

    var formatMarkdown = Ember.Handlebars.makeBoundHelper(function (markdown) {
        return new Handlebars.SafeString(showdown.makeHtml(markdown || ''));
    });

    __exports__["default"] = formatMarkdown;
  });
define("ghost/helpers/gh-format-timeago", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global moment */
    var formatTimeago = Ember.Handlebars.makeBoundHelper(function (timeago) {
        return moment(timeago).fromNow();
        // stefanpenner says cool for small number of timeagos.
        // For large numbers moment sucks => single Ember.Object based clock better
        // https://github.com/manuelmitasch/ghost-admin-ember-demo/commit/fba3ab0a59238290c85d4fa0d7c6ed1be2a8a82e#commitcomment-5396524
    });

    __exports__["default"] = formatTimeago;
  });
define("ghost/initializers/authentication", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var AuthenticationInitializer = {

        name: 'authentication',
        after: 'registerTrailingLocationHistory',

        initialize: function (container, application) {
            Ember.SimpleAuth.Session.reopen({
                user: function () {
                    return container.lookup('store:main').find('user', 'me');
                }.property()
            });
            Ember.SimpleAuth.Authenticators.OAuth2.reopen({
                serverTokenEndpoint: '/ghost/api/v0.1/authentication/token',
                refreshAccessTokens: true,
                makeRequest: function (data) {
                    data.client_id = 'ghost-admin';
                    return this._super(data);
                }
            });
            Ember.SimpleAuth.setup(container, application, {
                authenticationRoute: 'signin',
                routeAfterAuthentication: 'content',
                authorizerFactory: 'ember-simple-auth-authorizer:oauth2-bearer'
            });
        }
    };

    __exports__["default"] = AuthenticationInitializer;
  });
define("ghost/initializers/current-user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var currentUserInitializer = {
        name: 'currentUser',
        after: 'store',

        initialize: function (container, application) {
            var store = container.lookup('store:main'),
                preloadedUser = application.get('user');

            // If we don't have a user, don't do the injection
            if (!preloadedUser) {
                return;
            }

            // Push the preloaded user into the data store
            store.pushPayload({
                users: [preloadedUser]
            });

            // Signal to wait until the user is loaded before continuing.
            application.deferReadiness();

            // Find the user (which should be fast since we just preloaded it in the store)
            store.find('user', preloadedUser.id).then(function (user) {
                // Register the value for injection
                application.register('user:current', user, { instantiate: false });

                // Inject into the routes and controllers as the user property.
                application.inject('route', 'user', 'user:current');
                application.inject('controller', 'user', 'user:current');

                application.advanceReadiness();
            });
        }
    };

    __exports__["default"] = currentUserInitializer;
  });
define("ghost/initializers/ghost-config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ConfigInitializer = {
        name: 'config',

        initialize: function (container, application) {
            application.register('ghost:config', application.get('config'), {instantiate: false});

            application.inject('route', 'config', 'ghost:config');
            application.inject('controller', 'config', 'ghost:config');
            application.inject('component', 'config', 'ghost:config');
        }
    };

    __exports__["default"] = ConfigInitializer;
  });
define("ghost/initializers/ghost-paths", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    var ghostPathsInitializer = {
        name: 'ghost-paths',
        after: 'store',

        initialize: function (container, application) {
            application.register('ghost:paths', ghostPaths(), { instantiate: false });

            application.inject('route', 'ghostPaths', 'ghost:paths');
            application.inject('model', 'ghostPaths', 'ghost:paths');
            application.inject('controller', 'ghostPaths', 'ghost:paths');
        }
    };

    __exports__["default"] = ghostPathsInitializer;
  });
define("ghost/initializers/notifications", 
  ["ghost/utils/notifications","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Notifications = __dependency1__["default"];

    var injectNotificationsInitializer = {
        name: 'injectNotifications',
        before: 'authentication',

        initialize: function (container, application) {
            application.register('notifications:main', Notifications);

            application.inject('controller', 'notifications', 'notifications:main');
            application.inject('component', 'notifications', 'notifications:main');
            application.inject('router', 'notifications', 'notifications:main');
            application.inject('route', 'notifications', 'notifications:main');
        }
    };

    __exports__["default"] = injectNotificationsInitializer;
  });
define("ghost/initializers/popover", 
  ["ghost/mixins/body-event-listener","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BodyEventListener = __dependency1__["default"];

    var PopoverService = Ember.Object.extend(Ember.Evented, BodyEventListener, {
        bodyClick: function (event) {
            /*jshint unused:false */
            this.closePopovers();
        },
        closePopovers: function () {
            this.trigger('close');
        },
        togglePopover: function (popoverName) {
            this.trigger('toggle', {target: popoverName});
        }
    });

    var popoverInitializer = {
        name: 'popover',

        initialize: function (container, application) {
            application.register('popover:service', PopoverService);

            application.inject('component:gh-popover', 'popover', 'popover:service');
            application.inject('component:gh-popover-button', 'popover', 'popover:service');
            application.inject('controller:modals.delete-post', 'popover', 'popover:service');
            application.inject('route:application', 'popover', 'popover:service');
        }
    };

    __exports__["default"] = popoverInitializer;
  });
define("ghost/initializers/trailing-history", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global Ember */

    var trailingHistory = Ember.HistoryLocation.extend({
        formatURL: function () {
            return this._super.apply(this, arguments).replace(/\/?$/, '/');
        }
    });

    var registerTrailingLocationHistory = {
        name: 'registerTrailingLocationHistory',

        initialize: function (container, application) {
            application.register('location:trailing-history', trailingHistory);
        }
    };

    __exports__["default"] = registerTrailingLocationHistory;
  });
define("ghost/mixins/body-event-listener", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*
    Code modified from Addepar/ember-widgets
    https://github.com/Addepar/ember-widgets/blob/master/src/mixins.coffee#L39
    */
    var BodyEventListener = Ember.Mixin.create({
        bodyElementSelector: 'html',
        bodyClick: Ember.K,
        init: function () {
            this._super();
            return Ember.run.next(this, this._setupDocumentHandlers);
        },
        willDestroy: function () {
            this._super();
            return this._removeDocumentHandlers();
        },
        _setupDocumentHandlers: function () {
            if (this._clickHandler) {
                return;
            }
            var self = this;
            this._clickHandler = function () {
                return self.bodyClick();
            };
            return $(this.get('bodyElementSelector')).on('click', this._clickHandler);
        },
        _removeDocumentHandlers: function () {
            $(this.get('bodyElementSelector')).off('click', this._clickHandler);
            this._clickHandler = null;
        },
        /* 
        http://stackoverflow.com/questions/152975/how-to-detect-a-click-outside-an-element
        */
        click: function (event) {
            return event.stopPropagation();
        }
    });

    __exports__["default"] = BodyEventListener;
  });
define("ghost/mixins/editor-base-controller", 
  ["ghost/mixins/marker-manager","ghost/models/post","ghost/utils/bound-one-way","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    /* global console */
    var MarkerManager = __dependency1__["default"];
    var PostModel = __dependency2__["default"];
    var boundOneWay = __dependency3__["default"];

    // this array will hold properties we need to watch
    // to know if the model has been changed (`controller.isDirty`)
    var watchedProps = ['scratch', 'model.isDirty'];

    Ember.get(PostModel, 'attributes').forEach(function (name) {
        watchedProps.push('model.' + name);
    });

    // watch if number of tags changes on the model
    watchedProps.push('tags.[]');

    var EditorControllerMixin = Ember.Mixin.create(MarkerManager, {

        needs: ['post-tags-input'],

        init: function () {
            var self = this;

            this._super();

            window.onbeforeunload = function () {
                return self.get('isDirty') ? self.unloadDirtyMessage() : null;
            };
        },
        /**
         * By default, a post will not change its publish state.
         * Only with a user-set value (via setSaveType action)
         * can the post's status change.
         */
        willPublish: boundOneWay('isPublished'),

        // set by the editor route and `isDirty`. useful when checking
        // whether the number of tags has changed for `isDirty`.
        previousTagNames: null,

        tagNames: function () {
            return this.get('tags').mapBy('name');
        }.property('tags.[]'),

        // compares previousTagNames to tagNames
        tagNamesEqual: function () {
            var tagNames = this.get('tagNames'),
                previousTagNames = this.get('previousTagNames'),
                hashCurrent,
                hashPrevious;

            // beware! even if they have the same length,
            // that doesn't mean they're the same.
            if (tagNames.length !== previousTagNames.length) {
                return false;
            }

            // instead of comparing with slow, nested for loops,
            // perform join on each array and compare the strings
            hashCurrent = tagNames.join('');
            hashPrevious = previousTagNames.join('');

            return hashCurrent === hashPrevious;
        },

        // a hook created in editor-route-base's setupController
        modelSaved: function () {
            var model = this.get('model');

            // safer to updateTags on save in one place
            // rather than in all other places save is called
            model.updateTags();

            // set previousTagNames to current tagNames for isDirty check
            this.set('previousTagNames', this.get('tagNames'));

            // `updateTags` triggers `isDirty => true`.
            // for a saved model it would otherwise be false.
            this.set('isDirty', false);
        },

        // an ugly hack, but necessary to watch all the model's properties
        // and more, without having to be explicit and do it manually
        isDirty: Ember.computed.apply(Ember, watchedProps.concat(function (key, value) {
            if (arguments.length > 1) {
                return value;
            }

            var model = this.get('model'),
                markdown = this.get('markdown'),
                scratch = this.getMarkdown().withoutMarkers,
                changedAttributes;

            if (!this.tagNamesEqual()) {
                return true;
            }

            // since `scratch` is not model property, we need to check
            // it explicitly against the model's markdown attribute
            if (markdown !== scratch) {
                return true;
            }

            // models created on the client always return `isDirty: true`,
            // so we need to see which properties have actually changed.
            if (model.get('isNew')) {
                changedAttributes = Ember.keys(model.changedAttributes());

                if (changedAttributes.length) {
                    return true;
                }

                return false;
            }

            // even though we use the `scratch` prop to show edits,
            // which does *not* change the model's `isDirty` property,
            // `isDirty` will tell us if the other props have changed,
            // as long as the model is not new (model.isNew === false).
            if (model.get('isDirty')) {
                return true;
            }

            return false;
        })),

        // used on window.onbeforeunload
        unloadDirtyMessage: function () {
            return '==============================\n\n' +
                'Hey there! It looks like you\'re in the middle of writing' +
                ' something and you haven\'t saved all of your content.' +
                '\n\nSave before you go!\n\n' +
                '==============================';
        },

        //TODO: This has to be moved to the I18n localization file.
        //This structure is supposed to be close to the i18n-localization which will be used soon.
        messageMap: {
            errors: {
                post: {
                    published: {
                        'published': 'Your post could not be updated.',
                        'draft': 'Your post could not be saved as a draft.'
                    },
                    draft: {
                        'published': 'Your post could not be published.',
                        'draft': 'Your post could not be saved as a draft.'
                    }

                }
            },

            success: {
                post: {
                    published: {
                        'published': 'Your post has been updated.',
                        'draft': 'Your post has been saved as a draft.'
                    },
                    draft: {
                        'published': 'Your post has been published.',
                        'draft': 'Your post has been saved as a draft.'
                    }
                }
            }
        },

        showSaveNotification: function (prevStatus, status, delay) {
            var message = this.messageMap.success.post[prevStatus][status];
            this.notifications.closePassive();

            this.notifications.showSuccess(message, delay);
        },

        showErrorNotification: function (prevStatus, status, errors, delay) {
            var message = this.messageMap.errors.post[prevStatus][status];
            this.notifications.closePassive();

            message += '<br />' + errors[0].message;

            this.notifications.showError(message, delay);
        },

        actions: {
            save: function () {
                var status = this.get('willPublish') ? 'published' : 'draft',
                    prevStatus = this.get('status'),
                    isNew = this.get('isNew'),
                    self = this;

                self.notifications.closePassive();

                // ensure an incomplete tag is finalised before save
                this.get('controllers.post-tags-input').send('addNewTag');

                // Set the properties that are indirected
                // set markdown equal to what's in the editor, minus the image markers.
                this.set('markdown', this.getMarkdown().withoutMarkers);
                this.set('title', this.get('titleScratch'));
                this.set('status', status);

                return this.get('model').save().then(function (model) {
                    self.showSaveNotification(prevStatus, model.get('status'), isNew ? true : false);
                    return model;
                }).catch(function (errors) {
                    self.showErrorNotification(prevStatus, self.get('status'), errors);
                    return Ember.RSVP.reject(errors);
                });
            },

            setSaveType: function (newType) {
                if (newType === 'publish') {
                    this.set('willPublish', true);
                } else if (newType === 'draft') {
                    this.set('willPublish', false);
                } else {
                    console.warn('Received invalid save type; ignoring.');
                }
            },

            // set from a `sendAction` on the codemirror component,
            // so that we get a reference for handling uploads.
            setCodeMirror: function (codemirrorComponent) {
                var codemirror = codemirrorComponent.get('codemirror');

                this.set('codemirrorComponent', codemirrorComponent);
                this.set('codemirror', codemirror);
            },

            // fired from the gh-markdown component when an image upload starts
            disableCodeMirror: function () {
                this.get('codemirrorComponent').disableCodeMirror();
            },

            // fired from the gh-markdown component when an image upload finishes
            enableCodeMirror: function () {
                this.get('codemirrorComponent').enableCodeMirror();
            },

            // Match the uploaded file to a line in the editor, and update that line with a path reference
            // ensuring that everything ends up in the correct place and format.
            handleImgUpload: function (e, result_src) {
                var editor = this.get('codemirror'),
                    line = this.findLine(Ember.$(e.currentTarget).attr('id')),
                    lineNumber = editor.getLineNumber(line),
                    match = line.text.match(/\([^\n]*\)?/),
                    replacement = '(http://)';

                if (match) {
                    // simple case, we have the parenthesis
                    editor.setSelection(
                        {line: lineNumber, ch: match.index + 1},
                        {line: lineNumber, ch: match.index + match[0].length - 1}
                    );
                } else {
                    match = line.text.match(/\]/);
                    if (match) {
                        editor.replaceRange(
                            replacement,
                            {line: lineNumber, ch: match.index + 1},
                            {line: lineNumber, ch: match.index + 1}
                        );
                        editor.setSelection(
                            {line: lineNumber, ch: match.index + 2},
                            {line: lineNumber, ch: match.index + replacement.length }
                        );
                    }
                }
                editor.replaceSelection(result_src);
            }
        }
    });

    __exports__["default"] = EditorControllerMixin;
  });
define("ghost/mixins/editor-base-view", 
  ["ghost/utils/set-scroll-classname","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];

    var EditorViewMixin = Ember.Mixin.create({
        // create a hook for jQuery logic that will run after
        // a view and all child views have been rendered,
        // since didInsertElement runs only when the view's el
        // has rendered, and not necessarily all child views.
        //
        // http://mavilein.github.io/javascript/2013/08/01/Ember-JS-After-Render-Event/
        // http://emberjs.com/api/classes/Ember.run.html#method_next
        scheduleAfterRender: function () {
            Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
        }.on('didInsertElement'),

        // all child views will have rendered when this fires
        afterRenderEvent: function () {
            var $previewViewPort = this.$('.entry-preview-content');

            // cache these elements for use in other methods
            this.set('$previewViewPort', $previewViewPort);
            this.set('$previewContent', this.$('.rendered-markdown'));

            $previewViewPort.scroll(Ember.run.bind($previewViewPort, setScrollClassName, {
                target: this.$('.entry-preview'),
                offset: 10
            }));
        },

        removeScrollHandlers: function () {
            this.get('$previewViewPort').off('scroll');
        }.on('willDestroyElement'),

        // updated when gh-codemirror component scrolls
        markdownScrollInfo: null,

        // percentage of scroll position to set htmlPreview
        scrollPosition: Ember.computed('markdownScrollInfo', function () {
            if (!this.get('markdownScrollInfo')) {
                return 0;
            }

            var scrollInfo = this.get('markdownScrollInfo'),
                codemirror = scrollInfo.codemirror,
                markdownHeight = scrollInfo.height - scrollInfo.clientHeight,
                previewHeight = this.get('$previewContent').height() - this.get('$previewViewPort').height(),
                ratio = previewHeight / markdownHeight,
                previewPosition = scrollInfo.top * ratio,
                isCursorAtEnd = codemirror.getCursor('end').line > codemirror.lineCount() - 5;

            if (isCursorAtEnd) {
                previewPosition = previewHeight + 30;
            }

            return previewPosition;
        })
    });

    __exports__["default"] = EditorViewMixin;
  });
define("ghost/mixins/editor-route-base", 
  ["ghost/mixins/shortcuts-route","ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var ShortcutsRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var loadingIndicator = __dependency3__["default"];


    var EditorRouteBase = Ember.Mixin.create(styleBody, ShortcutsRoute, loadingIndicator, {
        actions: {
            save: function () {
                this.get('controller').send('save');
            },
            publish: function () {
                var controller = this.get('controller');
                controller.send('setSaveType', 'publish');
                controller.send('save');
            },
            toggleZenMode: function () {
                Ember.$('body').toggleClass('zen');
            },
            //The actual functionality is implemented in utils/codemirror-shortcuts
            codeMirrorShortcut: function (options) {
                this.get('controller.codemirror').shortcut(options.type);
            }
        },

        attachModelHooks: function (controller, model) {
            // this will allow us to track when the model is saved and update the controller
            // so that we can be sure controller.isDirty is correct, without having to update the
            // controller on each instance of `model.save()`.
            //
            // another reason we can't do this on `model.save().then()` is because the post-settings-menu
            // also saves the model, and passing messages is difficult because we have two
            // types of editor controllers, and the PSM also exists on the posts.post route.
            //
            // The reason we can't just keep this functionality in the editor controller is
            // because we need to remove these handlers on `willTransition` in the editor route.
            model.on('didCreate', controller, controller.get('modelSaved'));
            model.on('didUpdate', controller, controller.get('modelSaved'));
        },

        detachModelHooks: function (controller, model) {
            model.off('didCreate', controller, controller.get('modelSaved'));
            model.off('didUpdate', controller, controller.get('modelSaved'));
        },

        shortcuts: {
            //General Editor shortcuts
            'ctrl+s, command+s': 'save',
            'ctrl+alt+p': 'publish',
            'alt+shift+z': 'toggleZenMode',
            //CodeMirror Markdown Shortcuts
            'ctrl+alt+u': {action: 'codeMirrorShortcut', options: {type: 'strike'}},
            'ctrl+alt+1': {action: 'codeMirrorShortcut', options: {type: 'h1'}},
            'ctrl+alt+2': {action: 'codeMirrorShortcut', options: {type: 'h2'}},
            'ctrl+alt+3': {action: 'codeMirrorShortcut', options: {type: 'h3'}},
            'ctrl+alt+4': {action: 'codeMirrorShortcut', options: {type: 'h4'}},
            'ctrl+alt+5': {action: 'codeMirrorShortcut', options: {type: 'h5'}},
            'ctrl+alt+6': {action: 'codeMirrorShortcut', options: {type: 'h6'}},
            'ctrl+shift+i': {action: 'codeMirrorShortcut', options: {type: 'image'}},
            'ctrl+q': {action: 'codeMirrorShortcut', options: {type: 'blockquote'}},
            'ctrl+shift+1': {action: 'codeMirrorShortcut', options: {type: 'currentDate'}},
            'ctrl+b, command+b': {action: 'codeMirrorShortcut', options: {type: 'bold'}},
            'ctrl+i, command+i': {action: 'codeMirrorShortcut', options: {type: 'italic'}},
            'ctrl+k, command+k': {action: 'codeMirrorShortcut', options: {type: 'link'}},
            'ctrl+l': {action: 'codeMirrorShortcut', options: {type: 'list'}},
        /** Currently broken CodeMirror Markdown shortcuts.
          * some may be broken due to a conflict with CodeMirror commands
          *   (see http://codemirror.net/doc/manual.html#commands)
            'ctrl+U': {action: 'codeMirrorShortcut', options: {type: 'uppercase'}},
            'ctrl+shift+U': {action: 'codeMirrorShortcut', options: {type: 'lowercase'}},
            'ctrl+alt+shift+U': {action: 'codeMirrorShortcut', options: {type: 'titlecase'}}
            'ctrl+alt+W': {action: 'codeMirrorShortcut', options: {type: 'selectword'}},
            'ctrl+alt+c': {action: 'codeMirrorShortcut', options: {type: 'copyHTML'}},
            'ctrl+enter': {action: 'codeMirrorShortcut', options: {type: 'newLine'}},
           */
        }
    });

    __exports__["default"] = EditorRouteBase;
  });
define("ghost/mixins/loading-indicator", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // mixin used for routes to display a loading indicator when there is network activity
    var loaderOptions = {
        'showSpinner': false
    };
    NProgress.configure(loaderOptions);

    var loadingIndicator = Ember.Mixin.create({
        actions:  {

            loading: function () {
                NProgress.start();
                this.router.one('didTransition', function () {
                    NProgress.done();
                });
                return true;
            },

            error: function () {
                NProgress.done();
                return true;
            }
        }
    });

    __exports__["default"] = loadingIndicator;
  });
define("ghost/mixins/marker-manager", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var MarkerManager = Ember.Mixin.create({
        imageMarkdownRegex: /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
        markerRegex: /\{<([\w\W]*?)>\}/,

        uploadId: 1,

        // create an object that will be shared amongst instances.
        // makes it easier to use helper functions in different modules
        markers: {},

        // Add markers to the line if it needs one
        initMarkers: function (line) {
            var imageMarkdownRegex = this.get('imageMarkdownRegex'),
                markerRegex = this.get('markerRegex'),
                editor = this.get('codemirror'),
                isImage = line.text.match(imageMarkdownRegex),
                hasMarker = line.text.match(markerRegex);

            if (isImage && !hasMarker) {
                this.addMarker(line, editor.getLineNumber(line));
            }
        },

        // Get the markdown with all the markers stripped
        getMarkdown: function (value) {
            var marker, id,
                editor = this.get('codemirror'),
                markers = this.get('markers'),
                markerRegexForId = this.get('markerRegexForId'),
                oldValue = value || editor.getValue(),
                newValue = oldValue;

            for (id in markers) {
                if (markers.hasOwnProperty(id)) {
                    marker = markers[id];
                    newValue = newValue.replace(markerRegexForId(id), '');
                }
            }

            return {
                withMarkers: oldValue,
                withoutMarkers: newValue
            };
        },

        // check the given line to see if it has an image, and if it correctly has a marker
        // in the special case of lines which were just pasted in, any markers are removed to prevent duplication
        checkLine: function (ln, mode) {
            var editor = this.get('codemirror'),
                line = editor.getLineHandle(ln),
                imageMarkdownRegex = this.get('imageMarkdownRegex'),
                markerRegex = this.get('markerRegex'),
                isImage = line.text.match(imageMarkdownRegex),
                hasMarker;

            // We care if it is an image
            if (isImage) {
                hasMarker = line.text.match(markerRegex);

                if (hasMarker && (mode === 'paste' || mode === 'undo')) {
                    // this could be a duplicate, and won't be a real marker
                    this.stripMarkerFromLine(line);
                }

                if (!hasMarker) {
                    this.addMarker(line, ln);
                }
            }
            // TODO: hasMarker but no image?
        },

        // Add a marker to the given line
        // Params:
        // line - CodeMirror LineHandle
        // ln - line number
        addMarker: function (line, ln) {
            var marker,
                markers = this.get('markers'),
                editor = this.get('codemirror'),
                uploadPrefix = 'image_upload',
                uploadId = this.get('uploadId'),
                magicId = '{<' + uploadId + '>}',
                newText = magicId + line.text;

            editor.replaceRange(
                newText,
                {line: ln, ch: 0},
                {line: ln, ch: newText.length}
            );

            marker = editor.markText(
                {line: ln, ch: 0},
                {line: ln, ch: (magicId.length)},
                {collapsed: true}
            );

            markers[uploadPrefix + '_' + uploadId] = marker;
            this.set('uploadId', uploadId += 1);
        },

        // Check each marker to see if it is still present in the editor and if it still corresponds to image markdown
        // If it is no longer a valid image, remove it
        checkMarkers: function () {
            var id, marker, line,
                editor = this.get('codemirror'),
                markers = this.get('markers'),
                imageMarkdownRegex = this.get('imageMarkdownRegex');

            for (id in markers) {
                if (markers.hasOwnProperty(id)) {
                    marker = markers[id];

                    if (marker.find()) {
                        line = editor.getLineHandle(marker.find().from.line);
                        if (!line.text.match(imageMarkdownRegex)) {
                            this.removeMarker(id, marker, line);
                        }
                    } else {
                        this.removeMarker(id, marker);
                    }
                }
            }
        },

        // this is needed for when we transition out of the editor.
        // since the markers object is persistent and shared between classes that
        // mix in this mixin, we need to make sure markers don't carry over between edits.
        clearMarkers: function () {
            var markers = this.get('markers'),
                id,
                marker;

            // can't just `this.set('markers', {})`,
            // since it wouldn't apply to this mixin,
            // but only to the class that mixed this mixin in
            for (id in markers) {
                if (markers.hasOwnProperty(id)) {
                    marker = markers[id];
                    delete markers[id];
                    marker.clear();
                }
            }
        },

        // Remove a marker
        // Will be passed a LineHandle if we already know which line the marker is on
        removeMarker: function (id, marker, line) {
            var markers = this.get('markers');

            delete markers[id];
            marker.clear();

            if (line) {
                this.stripMarkerFromLine(line);
            } else {
                this.findAndStripMarker(id);
            }
        },

        // Removes the marker on the given line if there is one
        stripMarkerFromLine: function (line) {
            var editor = this.get('codemirror'),
                ln = editor.getLineNumber(line),
                markerRegex = /\{<([\w\W]*?)>\}/,
                markerText = line.text.match(markerRegex);


            if (markerText) {
                editor.replaceRange(
                    '',
                    {line: ln, ch: markerText.index},
                    {line: ln, ch: markerText.index + markerText[0].length}
                );
            }
        },

        // the regex
        markerRegexForId: function (id) {
            id = id.replace('image_upload_', '');
            return new RegExp('\\{<' + id + '>\\}', 'gmi');
        },

        // Find a marker in the editor by id & remove it
        // Goes line by line to find the marker by it's text if we've lost track of the TextMarker
        findAndStripMarker: function (id) {
            var self = this,
                editor = this.get('codemirror');

            editor.eachLine(function (line) {
                var markerText = self.markerRegexForId(id).exec(line.text),
                    ln;

                if (markerText) {
                    ln = editor.getLineNumber(line);
                    editor.replaceRange(
                        '',
                        {line: ln, ch: markerText.index},
                        {line: ln, ch: markerText.index + markerText[0].length}
                    );
                }
            });
        },

        // Find the line with the marker which matches
        findLine: function (result_id) {
            var editor = this.get('codemirror'),
                markers = this.get('markers');

            // try to find the right line to replace
            if (markers.hasOwnProperty(result_id) && markers[result_id].find()) {
                return editor.getLineHandle(markers[result_id].find().from.line);
            }

            return false;
        }
    });

    __exports__["default"] = MarkerManager;
  });
define("ghost/mixins/nprogress-save", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NProgressSaveMixin = Ember.Mixin.create({
        save: function (options) {
            if (options && options.disableNProgress) {
                return this._super(options);
            }
            
            NProgress.start();
            return this._super(options).then(function (value) {
                NProgress.done();
                return value;
            }).catch(function (error) {
                NProgress.done();
                return Ember.RSVP.reject(error);
            });
        }
    });

    __exports__["default"] = NProgressSaveMixin;
  });
define("ghost/mixins/popover-mixin", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*
      Popovers and their buttons are evented and do not propagate clicks.
    */
    var PopoverMixin = Ember.Mixin.create(Ember.Evented, {
        click: function (event) {
            this._super(event);
            return event.stopPropagation();
        }
    });

    __exports__["default"] = PopoverMixin;
  });
define("ghost/mixins/shortcuts-route", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global key, console */

    //Configure KeyMaster to respond to all shortcuts,
    //even inside of
    //input, textarea, and select.
    key.filter = function () {
        return true;
    };

    /**
     * Only routes can implement shortcuts.
     * If you need to trigger actions on the controller,
     * simply call them with `this.get('controller').send('action')`.
     *
     * To implement shortcuts, add this mixin to your `extend()`,
     * and implement a `shortcuts` hash.
     * In this hash, keys are shortcut combinations and values are route action names.
     *  (see [keymaster docs](https://github.com/madrobby/keymaster/blob/master/README.markdown)),
     * 
     * ```javascript
     * shortcuts: {
     *     'ctrl+s, command+s': 'save',
     *     'ctrl+alt+z': 'toggleZenMode'
     * }
     * ```
     * For more complex actions, shortcuts can instead have their value
     * be an object like {action, options}
     * ```javascript
     * shortcuts: {
     *      'ctrl+k': {action: 'markdownShortcut', options: 'createLink'}
     * }
     * ```
     */
    var ShortcutsRoute = Ember.Mixin.create({
        registerShortcuts: function () {
            var self = this,
                shortcuts = this.get('shortcuts');

            Ember.keys(shortcuts).forEach(function (shortcut) {
                key(shortcut, function (event) {
                    var action = shortcuts[shortcut],
                        options;
                    if (Ember.typeOf(action) !== 'string') {
                        options = action.options;
                        action = action.action;
                    }
                    
                    //stop things like ctrl+s from actually opening a save dialogue
                    event.preventDefault();
                    self.send(action, options);
                });
            });
        },
        removeShortcuts: function () {
            var shortcuts = this.get('shortcuts');

            Ember.keys(shortcuts).forEach(function (shortcut) {
                key.unbind(shortcut);
            });
        },
        activate: function () {
            this._super();
            if (!this.shortcuts) {
                console.error('Shortcuts not found on route');
                return;
            }
            this.registerShortcuts();
        },
        deactivate: function () {
            this._super();
            this.removeShortcuts();
        }
    });

    __exports__["default"] = ShortcutsRoute;
  });
define("ghost/mixins/style-body", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // mixin used for routes that need to set a css className on the body tag

    var styleBody = Ember.Mixin.create({
        activate: function () {
            this._super();
            var cssClasses = this.get('classNames');

            if (cssClasses) {
                Ember.run.schedule('afterRender', null, function () {
                    cssClasses.forEach(function (curClass) {
                        Ember.$('body').addClass(curClass);
                    });
                });
            }
        },

        deactivate: function () {
            this._super();
            var cssClasses = this.get('classNames');

            Ember.run.schedule('afterRender', null, function () {
                cssClasses.forEach(function (curClass) {
                    Ember.$('body').removeClass(curClass);
                });
            });
        }
    });

    __exports__["default"] = styleBody;
  });
define("ghost/mixins/validation-engine", 
  ["ghost/utils/ajax","ghost/utils/validator-extensions","ghost/validators/post","ghost/validators/setup","ghost/validators/signup","ghost/validators/signin","ghost/validators/forgotten","ghost/validators/setting","ghost/validators/reset","ghost/validators/user","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __exports__) {
    "use strict";
    var getRequestErrorMessage = __dependency1__.getRequestErrorMessage;

    var ValidatorExtensions = __dependency2__["default"];
    var PostValidator = __dependency3__["default"];
    var SetupValidator = __dependency4__["default"];
    var SignupValidator = __dependency5__["default"];
    var SigninValidator = __dependency6__["default"];
    var ForgotValidator = __dependency7__["default"];
    var SettingValidator = __dependency8__["default"];
    var ResetValidator = __dependency9__["default"];
    var UserValidator = __dependency10__["default"];

    // our extensions to the validator library
    ValidatorExtensions.init();

    // format errors to be used in `notifications.showErrors`.
    // result is [{ message: 'concatenated error messages' }]
    function formatErrors(errors, opts) {
        var message = 'There was an error';

        opts = opts || {};

        if (opts.wasSave && opts.validationType) {
            message += ' saving this ' + opts.validationType;
        }

        if (Ember.isArray(errors)) {
            // get the validator's error messages from the array.
            // normalize array members to map to strings.
            message = errors.map(function (error) {
                if (typeof error === 'string') {
                    return error;
                }

                return error.message;
            }).join('<br />');
        } else if (errors instanceof Error) {
            message += errors.message || '.';
        } else if (typeof errors === 'object') {
            // Get messages from server response
            message += ': ' + getRequestErrorMessage(errors, true);
        } else if (typeof errors === 'string') {
            message += ': ' + errors;
        } else {
            message += '.';
        }

        // set format for notifications.showErrors
        message = [{ message: message }];

        return message;
    }


    /**
    * The class that gets this mixin will receive these properties and functions.
    * It will be able to validate any properties on itself (or the model it passes to validate())
    * with the use of a declared validator.
    */
    var ValidationEngine = Ember.Mixin.create({
        // these validators can be passed a model to validate when the class that
        // mixes in the ValidationEngine declares a validationType equal to a key on this object.
        // the model is either passed in via `this.validate({ model: object })`
        // or by calling `this.validate()` without the model property.
        // in that case the model will be the class that the ValidationEngine
        // was mixed into, i.e. the controller or Ember Data model.
        validators: {
            post: PostValidator,
            setup: SetupValidator,
            signup: SignupValidator,
            signin: SigninValidator,
            forgotten: ForgotValidator,
            setting: SettingValidator,
            reset: ResetValidator,
            user: UserValidator
        },

        /**
        * Passses the model to the validator specified by validationType.
        * Returns a promise that will resolve if validation succeeds, and reject if not.
        * Some options can be specified:
        *
        * `format: false` - doesn't use formatErrors to concatenate errors for notifications.showErrors.
        *                   will return whatever the specified validator returns.
        *                   since notifications are a common usecase, `format` is true by default.
        *
        * `model: Object` - you can specify the model to be validated, rather than pass the default value of `this`,
        *                   the class that mixes in this mixin.
        */
        validate: function (opts) {
            var model = opts.model || this,
                type = this.get('validationType'),
                validator = this.get('validators.' + type);

            opts = opts || {};
            opts.validationType = type;

            return new Ember.RSVP.Promise(function (resolve, reject) {
                var validationErrors;

                if (!type || !validator) {
                    validationErrors = ['The validator specified, "' + type + '", did not exist!'];
                } else {
                    validationErrors = validator.check(model);
                }

                if (Ember.isEmpty(validationErrors)) {
                    return resolve();
                }

                if (opts.format !== false) {
                    validationErrors = formatErrors(validationErrors, opts);
                }

                return reject(validationErrors);
            });
        },

        /**
        * The primary goal of this method is to override the `save` method on Ember Data models.
        * This allows us to run validation before actually trying to save the model to the server.
        * You can supply options to be passed into the `validate` method, since the ED `save` method takes no options.
        */
        save: function (options) {
            var self = this,
                // this is a hack, but needed for async _super calls.
                // ref: https://github.com/emberjs/ember.js/pull/4301
                _super = this.__nextSuper;

            options = options || {};
            options.wasSave = true;

            // model.destroyRecord() calls model.save() behind the scenes.
            // in that case, we don't need validation checks or error propagation,
            // because the model itself is being destroyed.
            if (this.get('isDeleted')) {
                return this._super();
            }

            // If validation fails, reject with validation errors.
            // If save to the server fails, reject with server response.
            return this.validate(options).then(function () {
                return _super.call(self, options);
            }).catch(function (result) {
                // server save failed - validate() would have given back an array
                if (! Ember.isArray(result)) {
                    if (options.format !== false) {
                        // concatenate all errors into an array with a single object: [{ message: 'concatted message' }]
                        result = formatErrors(result, options);
                    } else {
                        // return the array of errors from the server
                        result = getRequestErrorMessage(result);
                    }
                }

                return Ember.RSVP.reject(result);
            });
        }
    });

    __exports__["default"] = ValidationEngine;
  });
define("ghost/models/app", 
  ["ghost/fixtures/apps","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var appFixtures = __dependency1__["default"];

    var App = DS.Model.extend({
        name: DS.attr('string'),
        package: DS.attr(),
        active: DS.attr('boolean')
    });

    App.reopenClass({
        FIXTURES: appFixtures
    });

    __exports__["default"] = App;
  });
define("ghost/models/notification", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Notification = DS.Model.extend({
        dismissible: DS.attr('boolean'),
        location: DS.attr('string'),
        status: DS.attr('string'),
        type: DS.attr('string'),
        message: DS.attr('string')
    });

    __exports__["default"] = Notification;
  });
define("ghost/models/post", 
  ["ghost/mixins/validation-engine","ghost/utils/bound-one-way","ghost/mixins/nprogress-save","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var boundOneWay = __dependency2__["default"];
    var NProgressSaveMixin = __dependency3__["default"];

    var Post = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
        validationType: 'post',

        uuid: DS.attr('string'),
        title: DS.attr('string', {defaultValue: ''}),
        slug: DS.attr('string'),
        markdown: DS.attr('string', {defaultValue: ''}),
        html: DS.attr('string'),
        image: DS.attr('string'),
        featured: DS.attr('boolean', {defaultValue: false}),
        page: DS.attr('boolean', {defaultValue: false}),
        status: DS.attr('string', {defaultValue: 'draft'}),
        language: DS.attr('string', {defaultValue: 'en_US'}),
        meta_title: DS.attr('string'),
        meta_description: DS.attr('string'),
        author: DS.belongsTo('user',  { async: true }),
        created_at: DS.attr('moment-date'),
        created_by: DS.belongsTo('user', { async: true }),
        updated_at: DS.attr('moment-date'),
        updated_by: DS.belongsTo('user', { async: true }),
        published_at: DS.attr('moment-date'),
        published_by: DS.belongsTo('user', { async: true }),
        tags: DS.hasMany('tag', { embedded: 'always' }),
        titleScratch: boundOneWay('title'),
        //## Computed post properties
        isPublished: Ember.computed.equal('status', 'published'),
        isDraft: Ember.computed.equal('status', 'draft'),

        // remove client-generated tags, which have `id: null`.
        // Ember Data won't recognize/update them automatically
        // when returned from the server with ids.
        updateTags: function () {
            var tags = this.get('tags'),
            oldTags = tags.filterBy('id', null);

            tags.removeObjects(oldTags);
            oldTags.invoke('deleteRecord');
        }
    });

    __exports__["default"] = Post;
  });
define("ghost/models/setting", 
  ["ghost/mixins/validation-engine","ghost/mixins/nprogress-save","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var NProgressSaveMixin = __dependency2__["default"];

    var Setting = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
        validationType: 'setting',

        title: DS.attr('string'),
        description: DS.attr('string'),
        email: DS.attr('string'),
        logo: DS.attr('string'),
        cover: DS.attr('string'),
        defaultLang: DS.attr('string'),
        postsPerPage: DS.attr('number'),
        forceI18n: DS.attr('boolean'),
        permalinks: DS.attr('string'),
        activeTheme: DS.attr('string'),
        availableThemes: DS.attr()
    });

    __exports__["default"] = Setting;
  });
define("ghost/models/slug-generator", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SlugGenerator = Ember.Object.extend({
        ghostPaths: null,
        value: null,
        toString: function () {
            return this.get('value');
        },
        generateSlug: function (textToSlugify) {
            var self = this,
                url;

            if (!textToSlugify) {
                return Ember.RSVP.resolve('');
            }

            url = this.get('ghostPaths.url').api('slugs', 'post', encodeURIComponent(textToSlugify));

            return ic.ajax.request(url, {
                type: 'GET'
            }).then(function (response) {
                var slug = response.slugs[0].slug;
                self.set('value', slug);
                return slug;
            });
        }
    });

    __exports__["default"] = SlugGenerator;
  });
define("ghost/models/tag", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Tag = DS.Model.extend({
    	uuid: DS.attr('string'),
    	name: DS.attr('string'),
    	slug: DS.attr('string'),
    	description: DS.attr('string'),
    	parent_id: DS.attr('number'),
    	meta_title: DS.attr('string'),
    	meta_description: DS.attr('string'),
    	created_at: DS.attr('date'),
    	created_by: DS.attr('number'),
    	updated_at: DS.attr('date'),
    	updated_by: DS.attr('number')
    });

    __exports__["default"] = Tag;
  });
define("ghost/models/user", 
  ["ghost/mixins/validation-engine","ghost/mixins/nprogress-save","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var NProgressSaveMixin = __dependency2__["default"];

    var User = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
        validationType: 'user',

        uuid: DS.attr('string'),
        name: DS.attr('string'),
        slug: DS.attr('string'),
        email: DS.attr('string'),
        image: DS.attr('string'),
        cover: DS.attr('string'),
        bio: DS.attr('string'),
        website: DS.attr('string'),
        location: DS.attr('string'),
        accessibility: DS.attr('string'),
        status: DS.attr('string'),
        language: DS.attr('string', {defaultValue: 'en_US'}),
        meta_title: DS.attr('string'),
        meta_description: DS.attr('string'),
        last_login: DS.attr('moment-date'),
        created_at: DS.attr('moment-date'),
        created_by: DS.attr('number'),
        updated_at: DS.attr('moment-date'),
        updated_by: DS.attr('number'),

        saveNewPassword: function () {
            var url = this.get('ghostPaths.url').api('users', 'password');
            return ic.ajax.request(url, {
                type: 'PUT',
                data: {
                    password: [{
                        'oldPassword': this.get('password'),
                        'newPassword': this.get('newPassword'),
                        'ne2Password': this.get('ne2Password')
                    }]
                }
            });
        },

        resendInvite: function () {
            var userData = {};

            userData.email = this.get('email');

            return ic.ajax.request(this.get('ghostPaths.url').api('users'), {
                type: 'POST',
                data: JSON.stringify({users: [userData]}),
                contentType: 'application/json'
            });
        },

        passwordValidationErrors: function () {
            var validationErrors = [];

            if (!validator.equals(this.get('newPassword'), this.get('ne2Password'))) {
                validationErrors.push({message: 'Your new passwords do not match'});
            }

            if (!validator.isLength(this.get('newPassword'), 8)) {
                validationErrors.push({message: 'Your password is not long enough. It must be at least 8 characters long.'});
            }

            return validationErrors;
        }.property('password', 'newPassword', 'ne2Password'),

        isPasswordValid: Ember.computed.empty('passwordValidationErrors.[]')

    });

    __exports__["default"] = User;
  });
define("ghost/router", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*global Ember */
    var ghostPaths = __dependency1__["default"];

    // ensure we don't share routes between all Router instances
    var Router = Ember.Router.extend();

    Router.reopen({
        location: 'trailing-history', // use HTML5 History API instead of hash-tag based URLs
        rootURL: ghostPaths().subdir + '/ghost/', // admin interface lives under sub-directory /ghost

        clearNotifications: function () {
            this.notifications.closePassive();
            this.notifications.displayDelayed();
        }.on('didTransition')
    });

    Router.map(function () {
        this.route('setup');
        this.route('signin');
        this.route('signout');
        this.route('signup', { path: '/signup/:token' });
        this.route('forgotten');
        this.route('reset', { path: '/reset/:token' });
        this.resource('posts', { path: '/' }, function () {
            this.route('post', { path: ':post_id' });
        });
        this.resource('editor', function () {
            this.route('new', { path: '' });
            this.route('edit', { path: ':post_id' });
        });
        this.resource('settings', function () {
            this.route('general');
            this.resource('settings.users', { path: '/users' }, function () {
                this.route('user', { path: '/:slug' });
            });
            this.route('apps');
        });
        this.route('debug');
        //Redirect legacy content to posts
        this.route('content');

        this.route('error404', { path: '/*path' });

    });

    __exports__["default"] = Router;
  });
define("ghost/routes/application", 
  ["ghost/mixins/shortcuts-route","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ShortcutsRoute = __dependency1__["default"];

    var ApplicationRoute = Ember.Route.extend(Ember.SimpleAuth.ApplicationRouteMixin, ShortcutsRoute, {

        shortcuts: {
            'esc': 'closePopups'
        },

        setupController: function () {
            Ember.run.next(this, function () {
                this.send('loadServerNotifications');
            });
        },

        actions: {
            closePopups: function () {
                this.get('popover').closePopovers();
                this.get('notifications').closeAll();

                this.send('closeModal');
            },

            signedIn: function () {
                this.send('loadServerNotifications', true);
            },

            openModal: function (modalName, model, type) {
                modalName = 'modals/' + modalName;
                // We don't always require a modal to have a controller
                // so we're skipping asserting if one exists
                if (this.controllerFor(modalName, true)) {
                    this.controllerFor(modalName).set('model', model);

                    if (type) {
                        this.controllerFor(modalName).set('imageType', type);
                        this.controllerFor(modalName).set('src', model.get(type));
                    }
                }
                return this.render(modalName, {
                    into: 'application',
                    outlet: 'modal'
                });
            },

            closeModal: function () {
                return this.disconnectOutlet({
                    outlet: 'modal',
                    parentView: 'application'
                });
            },

            loadServerNotifications: function (isDelayed) {
                var self = this;
                if (this.session.isAuthenticated) {
                    this.store.findAll('notification').then(function (serverNotifications) {
                        serverNotifications.forEach(function (notification) {
                            self.notifications.handleNotification(notification, isDelayed);
                        });
                    });
                }
            },

            handleErrors: function (errors) {
                var self = this;
                this.notifications.clear();
                errors.forEach(function (errorObj) {
                    self.notifications.showError(errorObj.message || errorObj);

                    if (errorObj.hasOwnProperty('el')) {
                        errorObj.el.addClass('input-error');
                    }
                });
            }
        }
    });

    __exports__["default"] = ApplicationRoute;
  });
define("ghost/routes/content", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ContentRoute = Ember.Route.extend({
        beforeModel: function () {
            this.transitionTo('posts');
        }
    });

    __exports__["default"] = ContentRoute;
  });
define("ghost/routes/debug", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var DebugRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
        classNames: ['settings'],

        model: function () {
            return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
                return records.get('firstObject');
            });
        }
    });

    __exports__["default"] = DebugRoute;
  });
define("ghost/routes/editor/edit", 
  ["ghost/mixins/editor-route-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var base = __dependency1__["default"];

    var EditorEditRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, base, {
        classNames: ['editor'],

        model: function (params) {
            var self = this,
                post,
                postId;

            postId = Number(params.post_id);

            if (!_.isNumber(postId) || !_.isFinite(postId) || postId % 1 !== 0 || postId <= 0) {
                return this.transitionTo('error404', 'editor/' + params.post_id);
            }

            post = this.store.getById('post', postId);

            if (post) {
                return post;
            }

            return this.store.find('post', {
                id: params.post_id,
                status: 'all',
                staticPages: 'all',
                include: 'tags'
            }).then(function (records) {
                var post = records.get('firstObject');

                if (post) {
                    return post;
                }

                return self.transitionTo('posts.index');
            });
        },

        serialize: function (model) {
            return {post_id: model.get('id')};
        },

        setupController: function (controller, model) {
            this._super(controller, model);
            controller.set('scratch', model.get('markdown'));
            // used to check if anything has changed in the editor
            controller.set('previousTagNames', model.get('tags').mapBy('name'));

            // attach model-related listeners created in editor-route-base
            this.attachModelHooks(controller, model);
        },

        actions: {
            willTransition: function (transition) {
                var controller = this.get('controller'),
                    isDirty = controller.get('isDirty'),

                    model = controller.get('model'),
                    isSaving = model.get('isSaving'),
                    isDeleted = model.get('isDeleted'),
                    modelIsDirty = model.get('isDirty');

                // when `isDeleted && isSaving`, model is in-flight, being saved
                // to the server. when `isDeleted && !isSaving && !modelIsDirty`,
                // the record has already been deleted and the deletion persisted.
                //
                // in either case  we can probably just transition now.
                // in the former case the server will return the record, thereby updating it.
                // @TODO: this will break if the model fails server-side validation.
                if (!(isDeleted && isSaving) && !(isDeleted && !isSaving && !modelIsDirty) && isDirty) {
                    transition.abort();
                    this.send('openModal', 'leave-editor', [controller, transition]);
                    return;
                }

                // since the transition is now certain to complete..
                window.onbeforeunload = null;

                // remove model-related listeners created in editor-route-base
                this.detachModelHooks(controller, model);
            }
        }
    });

    __exports__["default"] = EditorEditRoute;
  });
define("ghost/routes/editor/index", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var EditorRoute = Ember.Route.extend({
        beforeModel: function () {
            this.transitionTo('editor.new');
        }
    });

    __exports__["default"] = EditorRoute;
  });
define("ghost/routes/editor/new", 
  ["ghost/mixins/editor-route-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var base = __dependency1__["default"];

    var EditorNewRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, base, {
        classNames: ['editor'],

        model: function () {
            var self = this;
            return this.get('session.user').then(function (user) {
                return self.store.createRecord('post', {
                    author: user
                });
            });
        },

        setupController: function (controller, model) {
            this._super(controller, model);
            controller.set('scratch', '');

            // used to check if anything has changed in the editor
            controller.set('previousTagNames', Ember.A());

            // attach model-related listeners created in editor-route-base
            this.attachModelHooks(controller, model);
        },

        actions: {
            willTransition: function (transition) {
                var controller = this.get('controller'),
                    isDirty = controller.get('isDirty'),

                    model = controller.get('model'),
                    isNew = model.get('isNew'),
                    isSaving = model.get('isSaving'),
                    isDeleted = model.get('isDeleted'),
                    modelIsDirty = model.get('isDirty');

                // when `isDeleted && isSaving`, model is in-flight, being saved
                // to the server. when `isDeleted && !isSaving && !modelIsDirty`,
                // the record has already been deleted and the deletion persisted.
                //
                // in either case  we can probably just transition now.
                // in the former case the server will return the record, thereby updating it.
                // @TODO: this will break if the model fails server-side validation.
                if (!(isDeleted && isSaving) && !(isDeleted && !isSaving && !modelIsDirty) && isDirty) {
                    transition.abort();
                    this.send('openModal', 'leave-editor', [controller, transition]);
                    return;
                }

                if (isNew) {
                    model.deleteRecord();
                }

                // since the transition is now certain to complete..
                window.onbeforeunload = null;

                // remove model-related listeners created in editor-route-base
                this.detachModelHooks(controller, model);
            }
        }
    });

    __exports__["default"] = EditorNewRoute;
  });
define("ghost/routes/error404", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Error404Route = Ember.Route.extend({
        controllerName: 'error',
        templateName: 'error',

        model: function () {
            return {
                status: 404
            };
        }
    });

    __exports__["default"] = Error404Route;
  });
define("ghost/routes/forgotten", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var ForgottenRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-forgotten']
    });

    __exports__["default"] = ForgottenRoute;
  });
define("ghost/routes/posts", 
  ["ghost/mixins/style-body","ghost/mixins/shortcuts-route","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var ShortcutsRoute = __dependency2__["default"];
    var loadingIndicator = __dependency3__["default"];

    var paginationSettings = {
        status: 'all',
        staticPages: 'all',
        include: 'tags',
        page: 1
    };

    var PostsRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, ShortcutsRoute, styleBody, loadingIndicator, {
        classNames: ['manage'],

        model: function () {
            // using `.filter` allows the template to auto-update when new models are pulled in from the server.
            // we just need to 'return true' to allow all models by default.
            return this.store.filter('post', paginationSettings, function () {
                return true;
            });
        },

        setupController: function (controller, model) {
            this._super(controller, model);
            controller.set('paginationSettings', paginationSettings);
        },

        shortcuts: {
            'up': 'moveUp',
            'down': 'moveDown'
        },
        actions: {
            openEditor: function (post) {
                this.transitionTo('editor.edit', post);
            },
            moveUp: function () {
                window.alert('@todo keyboard post navigation: up');
            },
            moveDown: function () {
                window.alert('@todo keyboard post navigation: down');
            }
        }
    });

    __exports__["default"] = PostsRoute;
  });
define("ghost/routes/posts/index", 
  ["ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var loadingIndicator = __dependency1__["default"];

    var PostsIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
        // redirect to first post subroute unless no posts exist
        beforeModel: function () {
            var self = this;

            return this.store.find('post', {
                status: 'all',
                staticPages: 'all',
                include: 'tags'
            }).then(function (records) {
                var post = records.get('firstObject');

                if (post) {
                    return self.transitionTo('posts.post', post);
                }
            });
        }
    });

    __exports__["default"] = PostsIndexRoute;
  });
define("ghost/routes/posts/post", 
  ["ghost/mixins/loading-indicator","ghost/mixins/shortcuts-route","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var loadingIndicator = __dependency1__["default"];
    var ShortcutsRoute = __dependency2__["default"];

    var PostsPostRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, ShortcutsRoute, {
        model: function (params) {
            var self = this,
                post,
                postId;

            postId = Number(params.post_id);

            if (!_.isNumber(postId) || !_.isFinite(postId) || postId % 1 !== 0 || postId <= 0)
            {
                return this.transitionTo('error404', params.post_id);
            }

            post = this.store.getById('post', postId);

            if (post) {
                return post;
            }

            return this.store.find('post', {
                id: params.post_id,
                status: 'all',
                staticPages: 'all',
                include: 'tags'
            }).then(function (records) {
                var post = records.get('firstObject');

                if (post) {
                    return post;
                }

                return self.transitionTo('posts.index');
            });
        },
        shortcuts: {
            'enter': 'openEditor'
        },
        actions: {
            openEditor: function () {
                this.transitionTo('editor.edit', this.get('controller.model'));
            }
        }
    });

    __exports__["default"] = PostsPostRoute;
  });
define("ghost/routes/reset", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var ResetRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-reset'],
        setupController: function (controller, params) {
            controller.token = params.token;
        }
    });

    __exports__["default"] = ResetRoute;
  });
define("ghost/routes/settings", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SettingsRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
        classNames: ['settings']
    });

    __exports__["default"] = SettingsRoute;
  });
define("ghost/routes/settings/apps", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var AppsRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {
        beforeModel: function () {
            if (!this.get('config.apps')) {
                this.transitionTo('settings.general');
            }
        },
        model: function () {
            return this.store.find('app');
        }
    });

    __exports__["default"] = AppsRoute;
  });
define("ghost/routes/settings/general", 
  ["ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var loadingIndicator = __dependency1__["default"];

    var SettingsGeneralRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
        model: function () {
            return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
                return records.get('firstObject');
            });
        }
    });

    __exports__["default"] = SettingsGeneralRoute;
  });
define("ghost/routes/settings/index", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__.mobileQuery;

    var SettingsIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {
        activate: function () {
            this._super();
        },
        // redirect to general tab, unless on a mobile phone
        beforeModel: function () {
            if (!mobileQuery.matches) {
                this.transitionTo('settings.general');
            } else {
                //fill the empty {{outlet}} in settings.hbs if the user
                //goes to fullscreen

                //fillOutlet needs special treatment so that it is
                //properly bound to this when called from a MQ event
                this.set('fillOutlet', _.bind(function fillOutlet(mq) {
                    if (!mq.matches) {
                        this.transitionTo('settings.general');
                    }
                }, this));
                mobileQuery.addListener(this.fillOutlet);
            }
        },
        deactivate: function () {
            if (this.get('fillOutlet')) {
                mobileQuery.removeListener(this.fillOutlet);
            }
        }
    });

    __exports__["default"] = SettingsIndexRoute;
  });
define("ghost/routes/settings/users", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var UsersRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin);

    __exports__["default"] = UsersRoute;
  });
define("ghost/routes/settings/users/index", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var UsersIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {

        model: function () {
            return this.store.find('user');
        }
    });

    __exports__["default"] = UsersIndexRoute;
  });
define("ghost/routes/settings/users/user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsUserRoute = Ember.Route.extend({
        model: function (params) {
            // TODO: Make custom user adapter that uses /api/users/:slug endpoint
            // return this.store.find('user', { slug: params.slug });

            // Instead, get all the users and then find by slug
            return this.store.find('user').then(function (result) {
                return result.findBy('slug', params.slug);
            });
        },

        deactivate: function () {
            var model = this.modelFor('settings.users.user');

            // we want to revert any unsaved changes on exit
            if (model && model.get('isDirty')) {
                model.rollback();
            }

            this._super();
        }
    });

    __exports__["default"] = SettingsUserRoute;
  });
define("ghost/routes/setup", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SetupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-setup'],

        // use the beforeModel hook to check to see whether or not setup has been
        // previously completed.  If it has, stop the transition into the setup page.

        beforeModel: function () {
            var self = this;

            // If user is logged in, setup has already been completed.
            if (this.get('session').isAuthenticated) {
                this.transitionTo(Ember.SimpleAuth.routeAfterAuthentication);
                return;
            }

            // If user is not logged in, check the state of the setup process via the API
            return ic.ajax.request(this.get('ghostPaths.url').api('authentication/setup'), {
                type: 'GET'
            }).then(function (result) {
                var setup = result.setup[0].status;

                if (setup) {
                    return self.transitionTo('signin');
                }
            });
        }
    });

    __exports__["default"] = SetupRoute;
  });
define("ghost/routes/signin", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-login'],
        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.transitionTo(Ember.SimpleAuth.routeAfterAuthentication);
            }
        },
        actions: {
            sessionAuthenticationFailed: function (error) {
                this.notifications.showError(error.message);
            },
            sessionAuthenticationSucceeded: function () {
                var self = this;
                this.store.find('user', 'me').then(function (user) {
                    self.send('signedIn', user);
                    var attemptedTransition = self.get('session').get('attemptedTransition');
                    if (attemptedTransition) {
                        attemptedTransition.retry();
                        self.get('session').set('attemptedTransition', null);
                    } else {
                        self.transitionTo(Ember.SimpleAuth.routeAfterAuthentication);
                    }
                });
            },
            sessionInvalidationFailed: function (error) {
                this.notifications.showError(error.message);
            },
            sessionInvalidationSucceeded: function () {
                this.notifications.showSuccess('You were successfully signed out.', true);
                this.send('signedOut');
            }
        }


    });

    __exports__["default"] = SigninRoute;
  });
define("ghost/routes/signout", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SignoutRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
        classNames: ['ghost-signout'],

        afterModel: function (resolvedModel, transition) {
            if (Ember.canInvoke(transition, 'send')) {
                transition.abort();
                transition.send('invalidateSession');
                this.transitionTo('signin');
            } else {
                this.send('invalidateSession');
            }
        }
    });

    __exports__["default"] = SignoutRoute;
  });
define("ghost/routes/signup", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SignupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-signup'],
        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.transitionTo(Ember.SimpleAuth.routeAfterAuthentication);
            }
        },
        setupController: function (controller, params) {
            var tokenText = atob(params.token),
                email = tokenText.split('|')[1];
            controller.token = params.token;
            controller.email = email;
            controller.name = email.substring(0, email.indexOf('@'));
        }
    });

    __exports__["default"] = SignupRoute;
  });
define("ghost/serializers/application", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ApplicationSerializer = DS.RESTSerializer.extend({
        serializeIntoHash: function (hash, type, record, options) {
            // Our API expects an id on the posted object
            options = options || {};
            options.includeId = true;

            // We have a plural root in the API
            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Don't ever pass uuid's
            delete data.uuid;

            hash[root] = [data];
        }
    });

    __exports__["default"] = ApplicationSerializer;
  });
define("ghost/serializers/post", 
  ["ghost/serializers/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationSerializer = __dependency1__["default"];

    var PostSerializer = ApplicationSerializer.extend(DS.EmbeddedRecordsMixin, {
        // settings for the EmbeddedRecordsMixin.
        attrs: {
            tags: { embedded: 'always' }
        },

        extractSingle: function (store, primaryType, payload) {
            var root = this.keyForAttribute(primaryType.typeKey),
                pluralizedRoot = Ember.String.pluralize(primaryType.typeKey);

            // make payload { post: { title: '', tags: [obj, obj], etc. } }.
            // this allows ember-data to pull the embedded tags out again,
            // in the function `updatePayloadWithEmbeddedHasMany` of the
            // EmbeddedRecordsMixin (line: `if (!partial[attribute])`):
            // https://github.com/emberjs/data/blob/master/packages/activemodel-adapter/lib/system/embedded_records_mixin.js#L499
            payload[root] = payload[pluralizedRoot][0];
            delete payload[pluralizedRoot];

            return this._super.apply(this, arguments);
        },

        keyForAttribute: function (attr) {
            return attr;
        },

        keyForRelationship: function (relationshipName) {
            // this is a hack to prevent Ember-Data from deleting our `tags` reference.
            // ref: https://github.com/emberjs/data/issues/2051
            // @TODO: remove this once the situation becomes clearer what to do.
            if (relationshipName === 'tags') {
                return 'tag';
            }

            return relationshipName;
        },

        serializeIntoHash: function (hash, type, record, options) {
            options = options || {};

            // We have a plural root in the API
            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Don't ever pass uuid's
            delete data.uuid;

            hash[root] = [data];
        }
    });

    __exports__["default"] = PostSerializer;
  });
define("ghost/serializers/setting", 
  ["ghost/serializers/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationSerializer = __dependency1__["default"];

    var SettingSerializer = ApplicationSerializer.extend({
        serializeIntoHash: function (hash, type, record, options) {
            // Settings API does not want ids
            options = options || {};
            options.includeId = false;

            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options),
                payload = [];

            delete data.id;

            Object.keys(data).forEach(function (k) {
                payload.push({ key: k, value: data[k] });
            });

            hash[root] = payload;
        },

        extractArray: function (store, type, _payload) {
            var payload = { id: '0' };

            _payload.settings.forEach(function (setting) {
                payload[setting.key] = setting.value;
            });

            return [payload];
        },

        extractSingle: function (store, type, payload) {
            return this.extractArray(store, type, payload).pop();
        }
    });

    __exports__["default"] = SettingSerializer;
  });
define("ghost/transforms/moment-date", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global moment */
    var MomentDate = DS.Transform.extend({
        deserialize: function (serialized) {
            if (serialized) {
                return moment(serialized);
            }
            return serialized;
        },
        serialize: function (deserialized) {
            if (deserialized) {
                return moment(deserialized).toDate();
            }
            return deserialized;
        }
    });
    __exports__["default"] = MomentDate;
  });
define("ghost/utils/ajax", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global ic */

    var ajax = window.ajax = function () {
        return ic.ajax.request.apply(null, arguments);
    };

    // Used in API request fail handlers to parse a standard api error
    // response json for the message to display
    var getRequestErrorMessage = function (request, performConcat) {
        var message,
            msgDetail;

        // Can't really continue without a request
        if (!request) {
            return null;
        }

        // Seems like a sensible default
        message = request.statusText;

        // If a non 200 response
        if (request.status !== 200) {
            try {
                // Try to parse out the error, or default to 'Unknown'
                if (request.responseJSON.errors && Ember.isArray(request.responseJSON.errors)) {

                    message = request.responseJSON.errors.map(function (errorItem) {
                        return errorItem.message;
                    });
                } else {
                    message =  request.responseJSON.error || 'Unknown Error';
                }
            } catch (e) {
                msgDetail = request.status ? request.status + ' - ' + request.statusText : 'Server was not available';
                message = 'The server returned an error (' + msgDetail + ').';
            }
        }

        if (performConcat && Ember.isArray(message)) {
            message = message.join('<br />');
        }

        // return an array of errors by default
        if (!performConcat && typeof message === 'string') {
            message = [message];
        }

        return message;
    };

    __exports__.getRequestErrorMessage = getRequestErrorMessage;
    __exports__.ajax = ajax;
    __exports__["default"] = ajax;
  });
define("ghost/utils/bound-one-way", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     * Defines a property similarly to `Ember.computed.oneway`,
     * save that while a `oneway` loses its binding upon being set,
     * the `BoundOneWay` will continue to listen for upstream changes.
     *
     * This is an ideal tool for working with values inside of {{input}}
     * elements.
     * @param transform: a function to transform the **upstream** value.
     */
    var BoundOneWay = function (upstream, transform) {
        if (typeof transform !== 'function') {
            //default to the identity function
            transform = function (value) { return value; };
        }
        return function (key, value) {
            return arguments.length > 1 ? value : transform(this.get(upstream));
        }.property(upstream);
    };

    __exports__["default"] = BoundOneWay;
  });
define("ghost/utils/codemirror-mobile", 
  ["ghost/assets/lib/touch-editor","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*global CodeMirror, device, FastClick*/
    var createTouchEditor = __dependency1__["default"];

    var setupMobileCodeMirror,
        TouchEditor,
        init;

    setupMobileCodeMirror = function setupMobileCodeMirror() {
        var noop = function () {},
            key;

        for (key in CodeMirror) {
            if (CodeMirror.hasOwnProperty(key)) {
                CodeMirror[key] = noop;
            }
        }

        CodeMirror.fromTextArea = function (el, options) {
            return new TouchEditor(el, options);
        };

        CodeMirror.keyMap = { basic: {} };
    };

    init = function init() {
        //Codemirror does not function on mobile devices,
        // nor on any iDevice.
        if (device.mobile() || (device.tablet() && device.ios())) {
            $('body').addClass('touch-editor');

            // make editor tabs touch-to-toggle in portrait mode
            $('.floatingheader').on('touchstart', function () {
                $('.entry-markdown').toggleClass('active');
                $('.entry-preview').toggleClass('active');
            });

            Ember.touchEditor = true;
            //initialize FastClick to remove touch delays
            Ember.run.scheduleOnce('afterRender', null, function () {
                FastClick.attach(document.body);
            });
            TouchEditor = createTouchEditor();
            setupMobileCodeMirror();
        }
    };

    __exports__["default"] = {
        createIfMobile: init
    };
  });
define("ghost/utils/codemirror-shortcuts", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global CodeMirror, moment */
    /** Set up a shortcut function to be called via router actions.
     *  See editor-route-base
     */

    function init() {
        //Used for simple, noncomputational replace-and-go! shortcuts.
        //  See default case in shortcut function below.
        CodeMirror.prototype.simpleShortcutSyntax = {
            bold: '**$1**',
            italic: '*$1*',
            strike: '~~$1~~',
            code: '`$1`',
            link: '[$1](http://)',
            image: '![$1](http://)',
            blockquote: '> $1'
        };
        CodeMirror.prototype.shortcut = function (type) {
            var text = this.getSelection(),
                cursor = this.getCursor(),
                line = this.getLine(cursor.line),
                fromLineStart = {line: cursor.line, ch: 0},
                md, letterCount, textIndex, position;
            switch (type) {
            case 'h1':
                this.replaceRange('# ' + line, fromLineStart);
                this.setCursor(cursor.line, cursor.ch + 2);
                return;
            case 'h2':
                this.replaceRange('## ' + line, fromLineStart);
                this.setCursor(cursor.line, cursor.ch + 3);
                return;
            case 'h3':
                this.replaceRange('### ' + line, fromLineStart);
                this.setCursor(cursor.line, cursor.ch + 4);
                return;
            case 'h4':
                this.replaceRange('#### ' + line, fromLineStart);
                this.setCursor(cursor.line, cursor.ch + 5);
                return;
            case 'h5':
                this.replaceRange('##### ' + line, fromLineStart);
                this.setCursor(cursor.line, cursor.ch + 6);
                return;
            case 'h6':
                this.replaceRange('###### ' + line, fromLineStart);
                this.setCursor(cursor.line, cursor.ch + 7);
                return;
            case 'link':
                md = this.simpleShortcutSyntax.link.replace('$1', text);
                this.replaceSelection(md, 'end');
                if (!text) {
                    this.setCursor(cursor.line, cursor.ch + 1);
                } else {
                    textIndex = line.indexOf(text, cursor.ch - text.length);
                    position = textIndex + md.length - 1;
                    this.setSelection({
                        line: cursor.line,
                        ch: position - 7
                    }, {
                        line: cursor.line,
                        ch: position
                    });
                }
                return;
            case 'image':
                md = this.simpleShortcutSyntax.image.replace('$1', text);
                if (line !== '') {
                    md = '\n\n' + md;
                }
                this.replaceSelection(md, 'end');
                cursor = this.getCursor();
                this.setSelection({line: cursor.line, ch: cursor.ch - 8}, {line: cursor.line, ch: cursor.ch - 1});
                return;
            case 'list':
                md = text.replace(/^(\s*)(\w\W*)/gm, '$1* $2');
                this.replaceSelection(md, 'end');
                return;
            case 'currentDate':
                md = moment(new Date()).format('D MMMM YYYY');
                this.replaceSelection(md, 'end');
                return;
            /** @TODO
            case 'uppercase':
                md = text.toLocaleUpperCase();
                break;
            case 'lowercase':
                md = text.toLocaleLowerCase();
                break;
            case 'titlecase':
                md = text.toTitleCase();
                break;
            case 'selectword':
                word = this.getTokenAt(cursor);
                if (!/\w$/g.test(word.string)) {
                    this.setSelection({line: cursor.line, ch: word.start}, {line: cursor.line, ch: word.end - 1});
                } else {
                    this.setSelection({line: cursor.line, ch: word.start}, {line: cursor.line, ch: word.end});
                }
                break;
            case 'copyHTML':
                converter = new Showdown.converter();
                if (text) {
                    md = converter.makeHtml(text);
                } else {
                    md = converter.makeHtml(this.getValue());
                }

                $(".modal-copyToHTML-content").text(md).selectText();
                break;
            case 'newLine':
                if (line !== "") {
                    this.replaceRange(line + "\n\n", fromLineStart);
                }
                break;
            */
            default:
                if (this.simpleShortcutSyntax[type]) {
                    md = this.simpleShortcutSyntax[type].replace('$1', text);
                }
            }
            if (md) {
                this.replaceSelection(md, 'end');
                if (!text) {
                    letterCount = md.length;
                    this.setCursor({
                        line: cursor.line,
                        ch: cursor.ch + (letterCount / 2)
                    });
                }
            }
        };
    }

    __exports__["default"] = {
        init: init
    };
  });
define("ghost/utils/date-formatting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global moment */
    var parseDateFormats = ['DD MMM YY @ HH:mm', 'DD MMM YY HH:mm',
                            'DD MMM YYYY @ HH:mm', 'DD MMM YYYY HH:mm',
                            'DD/MM/YY @ HH:mm', 'DD/MM/YY HH:mm',
                            'DD/MM/YYYY @ HH:mm', 'DD/MM/YYYY HH:mm',
                            'DD-MM-YY @ HH:mm', 'DD-MM-YY HH:mm',
                            'DD-MM-YYYY @ HH:mm', 'DD-MM-YYYY HH:mm',
                            'YYYY-MM-DD @ HH:mm', 'YYYY-MM-DD HH:mm',
                            'DD MMM @ HH:mm', 'DD MMM HH:mm'],
        displayDateFormat = 'DD MMM YY @ HH:mm';

    /**
     * Add missing timestamps
     */
    var verifyTimeStamp = function (dateString) {
        if (dateString && !dateString.slice(-5).match(/\d+:\d\d/)) {
            dateString += ' 12:00';
        }
        return dateString;
    };

    //Parses a string to a Moment
    var parseDateString = function (value) {
        return value ? moment(verifyTimeStamp(value), parseDateFormats, true) : undefined;
    };

    //Formats a Date or Moment
    var formatDate = function (value) {
        return verifyTimeStamp(value ? moment(value).format(displayDateFormat) : '');
    };

    __exports__.parseDateString = parseDateString;
    __exports__.formatDate = formatDate;
  });
define("ghost/utils/ghost-paths", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var makeRoute = function (root, args) {
        var parts = Array.prototype.slice.call(args, 0).join('/'),
            route = [root, parts].join('/');

        if (route.slice(-1) !== '/') {
            route += '/';
        }

        return route;
    };


    function ghostPaths() {
        var path = window.location.pathname,
            subdir = path.substr(0, path.search('/ghost/')),
            adminRoot = subdir + '/ghost',
            apiRoot = subdir + '/ghost/api/v0.1';

        function assetUrl(src) {
            return subdir + src;
        }

        return {
            subdir: subdir,
            blogRoot: subdir + '/',
            adminRoot: adminRoot,
            apiRoot: apiRoot,
            userImage: assetUrl('/assets/img/user-image.png'),
            errorImageSrc: assetUrl('/ghost/img/404-ghost@2x.png'),
            errorImageSrcSet: assetUrl('/ghost/img/404-ghost.png') + ' 1x, ' +
                assetUrl('/ghost/img/404-ghost@2x.png') + ' 2x',

            url: {
                admin: function () {
                    return makeRoute(adminRoot, arguments);
                },

                api: function () {
                    return makeRoute(apiRoot, arguments);
                },

                asset: assetUrl
            }
        };
    }

    __exports__["default"] = ghostPaths;
  });
define("ghost/utils/link-view", 
  [],
  function() {
    "use strict";
    Ember.LinkView.reopen({
        active: Ember.computed('resolvedParams', 'routeArgs', function () {
            var isActive = this._super();

            Ember.set(this, 'alternateActive', isActive);

            return isActive;
        })
    });
  });
define("ghost/utils/mobile", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var mobileQuery = matchMedia('(max-width: 800px)'),

        responsiveAction = function responsiveAction(event, mediaCondition, cb) {
            if (!window.matchMedia(mediaCondition).matches) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            cb();
        };

    __exports__.mobileQuery = mobileQuery;
    __exports__.responsiveAction = responsiveAction;
    __exports__["default"] = {
        mobileQuery: mobileQuery,
        responsiveAction: responsiveAction
    };
  });
define("ghost/utils/notifications", 
  ["ghost/models/notification","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Notification = __dependency1__["default"];

    var Notifications = Ember.ArrayProxy.extend({
        delayedNotifications: [],
        content: Ember.A(),
        timeout: 3000,

        pushObject: function (object) {
            // object can be either a DS.Model or a plain JS object, so when working with
            // it, we need to handle both cases.

            // make sure notifications have all the necessary properties set.
            if (typeof object.toJSON === 'function') {
                // working with a DS.Model

                if (object.get('location') === '') {
                    object.set('location', 'bottom');
                }
            }
            else {
                if (!object.location) {
                    object.location = 'bottom';
                }
            }

            this._super(object);
        },
        handleNotification: function (message, delayed) {
            if (!message.status) {
                message.status = 'passive';
            }

            if (!delayed) {
                this.pushObject(message);
            } else {
                this.delayedNotifications.push(message);
            }
        },
        showError: function (message, delayed) {
            this.handleNotification({
                type: 'error',
                message: message
            }, delayed);
        },
        showErrors: function (errors) {
            for (var i = 0; i < errors.length; i += 1) {
                this.showError(errors[i].message || errors[i]);
            }
        },
        showAPIError: function (resp, defaultErrorText, delayed) {
            defaultErrorText = defaultErrorText || 'There was a problem on the server, please try again.';

            if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.error) {
                this.showError(resp.jqXHR.responseJSON.error, delayed);
            } else {
                this.showError(defaultErrorText, delayed);
            }
        },
        showInfo: function (message, delayed) {
            this.handleNotification({
                type: 'info',
                message: message
            }, delayed);
        },
        showSuccess: function (message, delayed) {
            this.handleNotification({
                type: 'success',
                message: message
            }, delayed);
        },
        // @Todo this function isn't referenced anywhere. Should it be removed?
        showWarn: function (message, delayed) {
            this.handleNotification({
                type: 'warn',
                message: message
            }, delayed);
        },
        displayDelayed: function () {
            var self = this;

            self.delayedNotifications.forEach(function (message) {
                self.pushObject(message);
            });
            self.delayedNotifications = [];
        },
        closeNotification: function (notification) {
            var self = this;

            if (notification instanceof Notification) {
                notification.deleteRecord();
                notification.save().finally(function () {
                    self.removeObject(notification);
                });
            } else {
                this.removeObject(notification);
            }
        },
        closePassive: function () {
            this.set('content', this.rejectBy('status', 'passive'));
        },
        closePersistent: function () {
            this.set('content', this.rejectBy('status', 'persistent'));
        },
        closeAll: function () {
            this.clear();
        }
    });

    __exports__["default"] = Notifications;
  });
define("ghost/utils/set-scroll-classname", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // ## scrollShadow
    // This adds a 'scroll' class to the targeted element when the element is scrolled
    // `this` is expected to be a jQuery-wrapped element
    // **target:** The element in which the class is applied. Defaults to scrolled element.
    // **class-name:** The class which is applied.
    // **offset:** How far the user has to scroll before the class is applied.
    var setScrollClassName = function (options) {
        var $target = options.target || this,
            offset = options.offset,
            className = options.className || 'scrolling';

        if (this.scrollTop() > offset) {
            $target.addClass(className);
        } else {
            $target.removeClass(className);
        }
    };

    __exports__["default"] = setScrollClassName;
  });
define("ghost/utils/text-field", 
  [],
  function() {
    "use strict";
    Ember.TextField.reopen({
        attributeBindings: ['autofocus']
    });
  });
define("ghost/utils/validator-extensions", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function init() {
        // Provide a few custom validators
        //
        validator.extend('empty', function (str) {
            return Ember.isBlank(str);
        });

        validator.extend('notContains', function (str, badString) {
            return !_.contains(str, badString);
        });
    }

    __exports__["default"] = {
        init: init
    };
  });
define("ghost/utils/word-count", 
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = function (s) {
        s = s.replace(/(^\s*)|(\s*$)/gi, ''); // exclude  start and end white-space
        s = s.replace(/[ ]{2,}/gi, ' '); // 2 or more space to 1
        s = s.replace(/\n /gi, '\n'); // exclude newline with a start spacing
        s = s.replace(/\n+/gi, '\n');
        return s.split(/ |\n/).length;
    }
  });
define("ghost/validators/forgotten", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ForgotValidator = Ember.Object.create({
        check: function (model) {
            var data = model.getProperties('email'),
                validationErrors = [];

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: 'Invalid Email'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = ForgotValidator;
  });
define("ghost/validators/post", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostValidator = Ember.Object.create({
        check: function (model) {
            var validationErrors = [],

                title = model.get('title');

            if (validator.empty(title)) {
                validationErrors.push({
                    message: 'You must specify a title for the post.'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = PostValidator;
  });
define("ghost/validators/reset", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ResetValidator = Ember.Object.create({
        check: function (model) {

            var data = model.getProperties('passwords'),
                p1 = data.passwords.newPassword,
                p2 = data.passwords.ne2Password,
                validationErrors = [];

            if (!validator.equals(p1, p2)) {
                validationErrors.push({
                    message: 'The two new passwords don\'t match.'
                });
            }

            if (!validator.isLength(p1, 8)) {
                validationErrors.push({
                    message: 'The password is not long enough.'
                });
            }
            return validationErrors;
        }
    });

    __exports__["default"] = ResetValidator;
  });
define("ghost/validators/setting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingValidator = Ember.Object.create({
        check: function (model) {
            var validationErrors = [],
                title = model.get('title'),
                description = model.get('description'),
                email = model.get('email'),
                postsPerPage = model.get('postsPerPage');

            if (!validator.isLength(title, 0, 150)) {
                validationErrors.push({ message: 'Title is too long' });
            }

            if (!validator.isLength(description, 0, 200)) {
                validationErrors.push({ message: 'Description is too long' });
            }

            if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
                validationErrors.push({ message: 'Please supply a valid email address' });
            }

            if (!validator.isInt(postsPerPage) || postsPerPage > 1000) {
                validationErrors.push({ message: 'Please use a number less than 1000' });
            }

            if (!validator.isInt(postsPerPage) || postsPerPage < 0) {
                validationErrors.push({ message: 'Please use a number greater than 0' });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = SettingValidator;
  });
define("ghost/validators/setup", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SetupValidator = Ember.Object.create({
        check: function (model) {
            var data = model.getProperties('blogTitle', 'name', 'email', 'password'),
                validationErrors = [];

            if (!validator.isLength(data.blogTitle, 1)) {
                validationErrors.push({
                    message: 'Please enter a blog title.'
                });
            }

            if (!validator.isLength(data.name, 1)) {
                validationErrors.push({
                    message: 'Please enter a name.'
                });
            }

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: 'Invalid Email.'
                });
            }

            if (!validator.isLength(data.password, 8)) {
                validationErrors.push({
                    message: 'Password must be at least 8 characters long.'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = SetupValidator;
  });
define("ghost/validators/signin", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SigninValidator = Ember.Object.create({
        check: function (model) {
            var data = model.getProperties('identification', 'password'),
                validationErrors = [];

            if (!validator.isEmail(data.identification)) {
                validationErrors.push('Invalid Email');
            }

            if (!validator.isLength(data.password || '', 1)) {
                validationErrors.push('Please enter a password');
            }

            return validationErrors;
        }
    });

    __exports__["default"] = SigninValidator;
  });
define("ghost/validators/signup", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SignupValidator = Ember.Object.create({
        check: function (model) {
            var data = model.getProperties('name', 'email', 'password'),
                validationErrors = [];

            if (!validator.isLength(data.name, 1)) {
                validationErrors.push({
                    message: 'Please enter a name.'
                });
            }

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: 'Invalid Email.'
                });
            }

            if (!validator.isLength(data.password, 8)) {
                validationErrors.push({
                    message: 'Password must be at least 8 characters long.'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = SignupValidator;
  });
define("ghost/validators/user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var UserValidator = Ember.Object.create({
        check: function (model) {
            var validator = this.validators[model.get('status')];

            if (typeof validator !== 'function') {
                return [];
            }

            return validator(model);
        },

        validators: {
            invited: function (model) {
                var validationErrors = [],
                    email = model.get('email'),
                    role = model.get('role');

                if (!validator.isEmail(email)) {
                    validationErrors.push({ message: 'Please supply a valid email address' });
                }

                if (!validator.isLength(role, 1)) {
                    validationErrors.push({ message: 'Please select a role' });
                }

                return validationErrors;
            },

            active: function (model) {
                var validationErrors = [],
                    name = model.get('name'),
                    bio = model.get('bio'),
                    email = model.get('email'),
                    location = model.get('location'),
                    website = model.get('website');

                if (!validator.isLength(name, 0, 150)) {
                    validationErrors.push({ message: 'Name is too long' });
                }

                if (!validator.isLength(bio, 0, 200)) {
                    validationErrors.push({ message: 'Bio is too long' });
                }

                if (!validator.isEmail(email)) {
                    validationErrors.push({ message: 'Please supply a valid email address' });
                }

                if (!validator.isLength(location, 0, 150)) {
                    validationErrors.push({ message: 'Location is too long' });
                }

                if (!_.isEmpty(website) &&
                    (!validator.isURL(website, { protocols: ['http', 'https'], require_protocol: true }) ||
                    !validator.isLength(website, 0, 2000))) {

                    validationErrors.push({ message: 'Website is not a valid url' });
                }

                return validationErrors;
            }
        }
    });

    __exports__["default"] = UserValidator;
  });
define("ghost/views/application", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var responsiveAction = __dependency1__.responsiveAction;

    var ApplicationView = Ember.View.extend({

        mobileInteractions: function () {
            var body = $('body');
            // ### Toggle the mobile sidebar menu
            $('[data-off-canvas]').on('click', function (event) {
                responsiveAction(event, '(max-width: 650px)', function () {
                    body.toggleClass('off-canvas');
                });
            });
            // #### Navigating within the sidebar closes it.
            $('.js-close-sidebar').on('click', function () {
                body.removeClass('off-canvas');
            });
        }.on('didInsertElement')
    });

    __exports__["default"] = ApplicationView;
  });
define("ghost/views/content-list-content-view", 
  ["ghost/utils/set-scroll-classname","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];

    var PostsListView = Ember.View.extend({
        classNames: ['content-list-content'],

        checkScroll: function (event) {
            var element = event.target,
                triggerPoint = 100,
                controller = this.get('controller'),
                isLoading = controller.get('isLoading');

            // If we haven't passed our threshold, exit
            if (isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
                return;
            }

            controller.send('loadNextPage');
        },

        didInsertElement: function () {
            var el = this.$();
            el.on('scroll', Ember.run.bind(this, this.checkScroll));
            el.on('scroll', Ember.run.bind(el, setScrollClassName, {
                target: el.closest('.content-list'),
                offset: 10
            }));
        },

        willDestroyElement: function () {
            var el = this.$();
            el.off('scroll');
        }
    });

    __exports__["default"] = PostsListView;
  });
define("ghost/views/content-preview-content-view", 
  ["ghost/utils/set-scroll-classname","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];

    var PostContentView = Ember.View.extend({
        classNames: ['content-preview-content'],

        didInsertElement: function () {
            var el = this.$();
            el.on('scroll', Ember.run.bind(el, setScrollClassName, {
                target: el.closest('.content-preview'),
                offset: 10
            }));
        },

        willDestroyElement: function () {
            var el = this.$();
            el.off('scroll');
        }
    });

    __exports__["default"] = PostContentView;
  });
define("ghost/views/editor-save-button", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var EditorSaveButtonView = Ember.View.extend({
        templateName: 'editor-save-button',
        tagName: 'section',
        classNames: ['js-publish-splitbutton'],
        classNameBindings: ['isDangerous:splitbutton-delete:splitbutton-save'],

        //Tracks whether we're going to change the state of the post on save
        isDangerous: function () {
            return this.get('controller.isPublished') !== this.get('controller.willPublish');
        }.property('controller.isPublished', 'controller.willPublish'),

        'save-text': function () {
            return this.get('controller.willPublish') ? this.get('publish-text') : this.get('draft-text');
        }.property('controller.willPublish'),

        'publish-text': function () {
            return this.get('controller.isPublished') ? 'Update Post' : 'Publish Now';
        }.property('controller.isPublished'),

        'draft-text': function () {
            return this.get('controller.isPublished') ? 'Unpublish' : 'Save Draft';
        }.property('controller.isPublished')
    });

    __exports__["default"] = EditorSaveButtonView;
  });
define("ghost/views/editor/edit", 
  ["ghost/mixins/editor-base-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorViewMixin = __dependency1__["default"];

    var EditorView = Ember.View.extend(EditorViewMixin, {
        tagName: 'section',
        classNames: ['entry-container']
    });

    __exports__["default"] = EditorView;
  });
define("ghost/views/editor/new", 
  ["ghost/mixins/editor-base-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorViewMixin = __dependency1__["default"];

    var EditorNewView = Ember.View.extend(EditorViewMixin, {
        tagName: 'section',
        templateName: 'editor/edit',
        classNames: ['entry-container']
    });

    __exports__["default"] = EditorNewView;
  });
define("ghost/views/item-view", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ItemView = Ember.View.extend({
        classNameBindings: ['active'],

        active: function () {
            return this.get('childViews.firstObject.active');
        }.property('childViews.firstObject.active')
    });

    __exports__["default"] = ItemView;
  });
define("ghost/views/post-item-view", 
  ["ghost/views/item-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var itemView = __dependency1__["default"];

    var PostItemView = itemView.extend({
        classNameBindings: ['isFeatured:featured', 'isPage:page'],

        isFeatured: Ember.computed.alias('controller.model.featured'),

        isPage: Ember.computed.alias('controller.model.page'),
        
        //Edit post on double click
        doubleClick: function () {
            this.get('controller').send('openEditor', this.get('controller.model'));
        }
        
    });

    __exports__["default"] = PostItemView;
  });
define("ghost/views/post-settings-menu-view", 
  ["ghost/utils/date-formatting","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global moment */
    var formatDate = __dependency1__.formatDate;

    var PostSettingsMenuView = Ember.View.extend({
        templateName: 'post-settings-menu',
        publishedAtBinding: Ember.Binding.oneWay('controller.publishedAt'),
        datePlaceholder: function () {
            return formatDate(moment());
        }.property('controller.publishedAt')
    });

    __exports__["default"] = PostSettingsMenuView;
  });
define("ghost/views/post-tags-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostTagsInputView = Ember.View.extend({
        tagName: 'section',
        elementId: 'entry-tags',
        classNames: 'left',

        templateName: 'post-tags-input',

        hasFocus: false,

        keys: {
            BACKSPACE: 8,
            TAB: 9,
            ENTER: 13,
            ESCAPE: 27,
            UP: 38,
            DOWN: 40,
            NUMPAD_ENTER: 108,
            COMMA: 188
        },

        didInsertElement: function () {
            this.get('controller').send('loadAllTags');
        },

        willDestroyElement: function () {
            this.get('controller').send('reset');
        },

        overlayStyles: function () {
            var styles = [],
                leftPos;

            if (this.get('hasFocus') && this.get('controller.suggestions.length')) {
                leftPos = this.$().find('#tags').position().left;
                styles.push('display: block');
                styles.push('left: ' + leftPos + 'px');
            } else {
                styles.push('display: none');
                styles.push('left', 0);
            }

            return styles.join(';');
        }.property('hasFocus', 'controller.suggestions.length'),


        tagInputView: Ember.TextField.extend({
            focusIn: function () {
                this.get('parentView').set('hasFocus', true);
            },

            focusOut: function () {
                this.get('parentView').set('hasFocus', false);

                // if (!Ember.isEmpty(this.get('value'))) {
                //     this.get('parentView.controller').send('addNewTag');
                // }
            },

            keyDown: function (event) {
                var controller = this.get('parentView.controller'),
                    keys = this.get('parentView.keys'),
                    hasValue;

                switch (event.keyCode) {
                    case keys.UP:
                        event.preventDefault();
                        controller.send('selectPreviousSuggestion');
                        break;

                    case keys.DOWN:
                        event.preventDefault();
                        controller.send('selectNextSuggestion');
                        break;

                    case keys.TAB:
                    case keys.ENTER:
                    case keys.NUMPAD_ENTER:
                    case keys.COMMA:
                        if (event.keyCode === keys.COMMA && event.shiftKey) {
                            break;
                        }

                        if (controller.get('selectedSuggestion')) {
                            event.preventDefault();
                            controller.send('addSelectedSuggestion');
                        } else {
                            // allow user to tab out of field if input is empty
                            hasValue = !Ember.isEmpty(this.get('value'));
                            if (hasValue || event.keyCode !== keys.TAB) {
                                event.preventDefault();
                                controller.send('addNewTag');
                            }
                        }
                        break;

                    case keys.BACKSPACE:
                        if (Ember.isEmpty(this.get('value'))) {
                            event.preventDefault();
                            controller.send('deleteLastTag');
                        }
                        break;

                    case keys.ESCAPE:
                        event.preventDefault();
                        controller.send('reset');
                        break;
                }
            }
        }),


        tagView: Ember.View.extend({
            tagName: 'span',
            classNames: 'tag',

            tag: null,

            click: function () {
                this.get('parentView.controller').send('deleteTag', this.get('tag'));
            }
        }),


        suggestionView: Ember.View.extend({
            tagName: 'li',
            classNameBindings: 'suggestion.selected',

            suggestion: null,

            // we can't use the 'click' event here as the focusOut event on the
            // input will fire first

            mouseDown: function (event) {
                event.preventDefault();
            },

            mouseUp: function (event) {
                event.preventDefault();
                this.get('parentView.controller').send('addTag',
                    this.get('suggestion.tag'));
            },
        })
    });

    __exports__["default"] = PostTagsInputView;
  });
define("ghost/views/posts", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var responsiveAction = __dependency1__.responsiveAction;

    var PostsView = Ember.View.extend({
        classNames: ['content-view-container'],
        tagName: 'section',

        mobileInteractions: function () {
            Ember.run.scheduleOnce('afterRender', this, function () {
                // ### Show content preview when swiping left on content list
                $('.manage').on('click', '.content-list ol li', function (event) {
                    responsiveAction(event, '(max-width: 800px)', function () {
                        $('.content-list').animate({right: '100%', left: '-100%', 'margin-right': '15px'}, 300);
                        $('.content-preview').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
                    });
                });

                // ### Hide content preview
                $('.manage').on('click', '.content-preview .button-back', function (event) {
                    responsiveAction(event, '(max-width: 800px)', function () {
                        $('.content-list').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
                        $('.content-preview').animate({right: '-100%', left: '100%', 'margin-left': '15px'}, 300);
                    });
                });
            });
        }.on('didInsertElement'),
    });

    __exports__["default"] = PostsView;
  });
define("ghost/views/settings", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__.mobileQuery;

    var SettingsView = Ember.View.extend({
        classNames: ['wrapper'],
        // used by SettingsContentBaseView and on resize to mobile from desktop
        showSettingsContent: function () {
            if (mobileQuery.matches) {
                $('.settings-sidebar').animate({right: '100%', left: '-110%', 'margin-right': '15px'}, 300);
                $('.settings-content').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
                $('.settings-header-inner').css('display', 'block');
            }
        },
        // used by SettingsIndexView
        showSettingsMenu: function () {
            if (mobileQuery.matches) {
                $('.settings-header-inner').css('display', 'none');
                $('.settings-sidebar').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
                $('.settings-content').animate({right: '-100%', left: '100%', 'margin-left': '15'}, 300);
            }
        },
        showAll: function () {
            //Remove any styles applied by jQuery#animate
            $('.settings-sidebar, .settings-content').removeAttr('style');
        },

        mobileInteractions: function () {
            this.set('changeLayout', _.bind(function changeLayout(mq) {
                if (mq.matches) {
                    //transitioned to mobile layout, so show content
                    this.showSettingsContent();
                } else {
                    //went from mobile to desktop
                    this.showAll();
                }
            }, this));
            mobileQuery.addListener(this.changeLayout);
        }.on('didInsertElement'),

        removeMobileInteractions: function () {
            mobileQuery.removeListener(this.changeLayout);
        }.on('willDestroyElement')
    });

    __exports__["default"] = SettingsView;
  });
define("ghost/views/settings/apps", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsAppsView = BaseView.extend();

    __exports__["default"] = SettingsAppsView;
  });
define("ghost/views/settings/content-base", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     * All settings views other than the index should inherit from this base class.
     * It ensures that the correct screen is showing when a mobile user navigates
     * to a `settings.someRouteThatIsntIndex` route.
     */

    var SettingsContentBaseView = Ember.View.extend({
        tagName: 'section',
        classNames: ['settings-content', 'fade-in'],
        showContent: function () {
            this.get('parentView').showSettingsContent();
        }.on('didInsertElement')
    });

    __exports__["default"] = SettingsContentBaseView;
  });
define("ghost/views/settings/general", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsGeneralView = BaseView.extend();

    __exports__["default"] = SettingsGeneralView;
  });
define("ghost/views/settings/index", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsIndexView = Ember.View.extend({
        //Ensure that going to the index brings the menu into view on mobile.
        showMenu: function () {
            this.get('parentView').showSettingsMenu();
        }.on('didInsertElement')
    });

    __exports__["default"] = SettingsIndexView;
  });
define("ghost/views/settings/users", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsUsersView = BaseView.extend();

    __exports__["default"] = SettingsUsersView;
  });
//# sourceMappingURL=ghost-dev-ember.js.map