package com.superproductivity.superproductivity.widget

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.util.Log
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView

import com.superproductivity.superproductivity.R

/**
 * Manages a native overlay shown on top of the webview during app startup.
 * Shows a FAB initially; tapping it reveals an input bar for quick task entry.
 * Tasks are stored durably in CaptureInbox and imported by the app after hydration.
 */
class StartupOverlayManager(private val activity: android.app.Activity) {
    private var overlayView: View? = null
    private var fab: ImageButton? = null
    private var editText: EditText? = null
    private var feedbackText: TextView? = null
    private var barView: LinearLayout? = null
    private var insetLayoutListener: ViewTreeObserver.OnGlobalLayoutListener? = null
    private var taskCount = 0
    private var isBarVisible = false
    // Reused scratch for the per-layout geometry read (see updateOverlayInsets).
    private val visibleFrame = Rect()
    private val overlayLocation = IntArray(2)

    private val isDarkMode: Boolean
        get() {
            val nightMode = activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            return nightMode == Configuration.UI_MODE_NIGHT_YES
        }

    fun show() {
        val rootView = activity.findViewById<ViewGroup>(android.R.id.content)
        overlayView = LayoutInflater.from(activity).inflate(R.layout.startup_overlay, rootView, false)
        rootView.addView(overlayView)

        fab = overlayView?.findViewById(R.id.startup_fab)
        editText = overlayView?.findViewById(R.id.startup_task_input)
        feedbackText = overlayView?.findViewById(R.id.startup_task_feedback)
        barView = overlayView?.findViewById(R.id.startup_overlay_bar)

        applyTheme()

        // The overlay lives on android.R.id.content. Lift the FAB / input bar
        // above whatever covers the bottom of that container (navigation bar,
        // keyboard) so they line up with the web bar we hand off to. Re-measured
        // on every layout: it catches insets applied late, rotation and the
        // keyboard opening and closing. See updateOverlayInsets.
        insetLayoutListener = ViewTreeObserver.OnGlobalLayoutListener { updateOverlayInsets() }
        rootView.viewTreeObserver.addOnGlobalLayoutListener(insetLayoutListener)
        updateOverlayInsets()

        editText?.setOnEditorActionListener { _, actionId, event ->
            if (actionId == EditorInfo.IME_ACTION_DONE ||
                (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)
            ) {
                submitTask()
                true
            } else {
                false
            }
        }

        editText?.isFocusableInTouchMode = true

        // FAB tap → expand to input bar
        fab?.setOnClickListener { expandToInputBar() }

        // Show FAB immediately
        fab?.alpha = 1f

        Log.d(TAG, "Startup overlay shown (darkMode=$isDarkMode)")
    }

    /**
     * Lift the FAB / input bar so their bottom edge sits a fixed gap above the
     * window's visible display frame — the top of the navigation bar, or of the
     * keyboard while it is up. That is where the web add-task button/bar ends up
     * too, whichever way its bottom inset is applied.
     *
     * Only the part of the visible-frame cut-off that still overlaps the
     * overlay's own container is added: whatever padding already moved the
     * container up must not be counted again. Capacitor's SystemBars decides
     * that padding, and it changed in 8.5.2 — it now pads the DecorView (which
     * holds android.R.id.content) for the system bars and the keyboard instead
     * of only the WebView's parent, so the old "add the nav-bar inset, plus the
     * keyboard height" margins lifted the overlay twice. Measuring the container
     * against the visible frame is right under either contract.
     * See docs/android-edge-to-edge-keyboard.md ("Capacitor 8.5.2+").
     */
    private fun updateOverlayInsets() {
        val overlay = overlayView ?: return
        if (overlay.height == 0) return

        overlay.getWindowVisibleDisplayFrame(visibleFrame)
        overlay.getLocationOnScreen(overlayLocation)
        val overlayBottom = overlayLocation[1] + overlay.height
        val covered = (overlayBottom - visibleFrame.bottom).coerceAtLeast(0)

        val density = activity.resources.displayMetrics.density
        setBottomMargin(fab, (FAB_GAP_DP * density).toInt() + covered)
        setBottomMargin(barView, (BAR_GAP_DP * density).toInt() + covered)
    }

    /** No-op when unchanged, so the layout pass this triggers settles at once. */
    private fun setBottomMargin(view: View?, bottomMargin: Int) {
        val lp = view?.layoutParams as? ViewGroup.MarginLayoutParams ?: return
        if (lp.bottomMargin == bottomMargin) return
        lp.bottomMargin = bottomMargin
        view.layoutParams = lp
    }

    private fun expandToInputBar() {
        if (isBarVisible) return
        isBarVisible = true

        // Hide FAB
        fab?.visibility = View.GONE

        // Show input bar with slide-up
        barView?.visibility = View.VISIBLE
        barView?.translationY = 100f
        barView?.alpha = 0f
        barView?.animate()
            ?.translationY(0f)
            ?.alpha(1f)
            ?.setDuration(150)
            ?.setInterpolator(DecelerateInterpolator())
            ?.start()

        // Focus input and show keyboard
        editText?.requestFocus()
        editText?.postDelayed({
            val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.showSoftInput(editText, InputMethodManager.SHOW_IMPLICIT)
        }, 200)

        Log.d(TAG, "Expanded to input bar")
    }

    private fun applyTheme() {
        val density = activity.resources.displayMetrics.density
        val cornerPx = 4 * density // match web --card-border-radius: 4px

        // Style the FAB — match loading animation color (#6495ed)
        val fabColor = Color.parseColor("#6495ED")
        val fabBg = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(fabColor)
        }
        fab?.background = fabBg

        // Match web AddTaskBar: left/right 4px, bottom gap + 36px action bar
        // height. updateOverlayInsets() re-applies the bottom with the insets.
        val sideMarginPx = (4 * density).toInt()
        val bottomMarginPx = (BAR_GAP_DP * density).toInt()
        val params = barView?.layoutParams as? ViewGroup.MarginLayoutParams
        params?.leftMargin = sideMarginPx
        params?.rightMargin = sideMarginPx
        params?.bottomMargin = bottomMarginPx
        barView?.layoutParams = params

        // Match web: elevation shadow instead of colored border
        barView?.elevation = 12 * density
        barView?.clipToOutline = true

        if (isDarkMode) {
            val barBg = GradientDrawable().apply {
                setColor(Color.parseColor("#333333"))
                cornerRadius = cornerPx
            }
            barView?.background = barBg
            editText?.setTextColor(Color.WHITE)
            editText?.setHintTextColor(Color.argb(128, 255, 255, 255))
            feedbackText?.setTextColor(Color.argb(128, 255, 255, 255))
        } else {
            val barBg = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = cornerPx
            }
            barView?.background = barBg
            editText?.setTextColor(Color.parseColor("#212121"))
            editText?.setHintTextColor(Color.argb(128, 33, 33, 33))
            feedbackText?.setTextColor(Color.argb(128, 33, 33, 33))
        }
    }

    private fun submitTask() {
        val title = editText?.text?.toString()?.trim() ?: return
        if (title.isEmpty()) return

        try {
            CaptureInbox.forContext(activity).add(title, "overlay")
        } catch (e: Exception) {
            // Keep the typed text so nothing is silently lost. Never log the title.
            Log.e(TAG, "Failed to store quick-add capture", e)
            return
        }
        taskCount++

        editText?.text?.clear()
        updateFeedback()

        Log.d(TAG, "Task queued from startup overlay (total: $taskCount)")
    }

    private fun updateFeedback() {
        feedbackText?.text = activity.resources.getQuantityString(
            R.plurals.startup_tasks_queued, taskCount, taskCount
        )
        feedbackText?.visibility = View.VISIBLE
    }

    /**
     * Phase 1: Returns partial text but keeps the native overlay visible.
     * Returns null if the bar was never opened, empty string if opened but empty.
     */
    fun getPartialTextAndPrepare(): String? {
        if (!isBarVisible) return null
        val partialText = editText?.text?.toString()?.trim() ?: ""
        Log.d(TAG, "getPartialTextAndPrepare: partialTextLength=${partialText.length}, tasksQueued=$taskCount")
        return partialText
    }

    /**
     * Phase 2: Actually hides and removes the overlay.
     * Called by JS after the web input is ready and focused.
     */
    fun hide() {
        removeLayoutListener()

        overlayView?.animate()
            ?.alpha(0f)
            ?.setDuration(150)
            ?.withEndAction { removeOverlayView() }
            ?.start()

        Log.d(TAG, "Startup overlay hidden")
    }

    /**
     * Dismiss without partial text transfer.
     */
    fun dismiss() {
        removeLayoutListener()

        if (isBarVisible) {
            val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            editText?.let { imm?.hideSoftInputFromWindow(it.windowToken, 0) }

            barView?.animate()
                ?.translationY(200f)
                ?.alpha(0f)
                ?.setDuration(250)
                ?.setInterpolator(AccelerateInterpolator())
                ?.withEndAction { removeOverlayView() }
                ?.start()
        } else {
            // FAB still showing — remove immediately
            removeOverlayView()
        }

        Log.d(TAG, "Startup overlay dismissed")
    }

    private fun removeLayoutListener() {
        val observer = activity.findViewById<View>(android.R.id.content)?.viewTreeObserver
        insetLayoutListener?.let { observer?.removeOnGlobalLayoutListener(it) }
        insetLayoutListener = null
    }

    private fun removeOverlayView() {
        (overlayView?.parent as? ViewGroup)?.removeView(overlayView)
        overlayView = null
        fab = null
        editText = null
        feedbackText = null
        barView = null
    }

    companion object {
        private const val TAG = "StartupOverlay"

        // Bottom gaps (dp) above the visible display frame (nav bar / keyboard
        // top). Internal for StartupOverlayInsetInstrumentedTest. The FAB mirrors
        // the web bottom-nav button, whose bottom edge sits ~6dp above the nav
        // line (measured). The input bar adds 36dp on top to clear the web
        // add-task-bar's action-button row. Fine-tune here if a device shows a
        // small constant offset (these are now device-independent of nav type).
        internal const val FAB_GAP_DP = 6
        internal const val BAR_GAP_DP = 6 + 36
    }
}
