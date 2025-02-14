import { commands } from 'vscode'
import { AvailableCommands, InternalCommands } from '../../commands/internal'
import { Toast } from '../../vscode/toast'
import { WorkspaceExperiments } from '../workspace'
import { Setup } from '../../setup'
import { Response } from '../../vscode/response'
import {
  ConfigKey,
  getConfigValue,
  setUserConfigValue
} from '../../vscode/config'
import { STUDIO_URL } from '../../setup/webview/contract'
import { RegisteredCommands } from '../../commands/external'

export const getBranchExperimentCommand =
  (experiments: WorkspaceExperiments) =>
  (cwd: string, name: string, input: string) =>
    experiments.runCommand(AvailableCommands.EXP_BRANCH, cwd, name, input)

const promptToAddStudioToken = async () => {
  const response = await Toast.askShowOrCloseOrNever(
    `Experiments can be automatically shared to [Studio](${STUDIO_URL}) by setting the studio.token in your config.`
  )

  if (!response || response === Response.CLOSE) {
    return
  }
  if (response === Response.SHOW) {
    return commands.executeCommand(RegisteredCommands.SETUP_SHOW_STUDIO_CONNECT)
  }
  if (response === Response.NEVER) {
    return setUserConfigValue(ConfigKey.DO_NOT_RECOMMEND_ADD_STUDIO_TOKEN, true)
  }
}

const convertUrlTextToLink = (stdout: string) => {
  const experimentAtRegex = /\sat\s+(https:\/\/studio\.iterative\.ai\/.*$)/
  const match = stdout.match(experimentAtRegex)
  if (!(match?.[0] && match?.[1])) {
    return stdout
  }
  return stdout.replace(match[0], ` in [Studio](${match[1]})`)
}

export const getPushExperimentCommand =
  (
    experiments: WorkspaceExperiments,
    internalCommands: InternalCommands,
    setup: Setup
  ) =>
  ({ dvcRoot, ids }: { dvcRoot: string; ids: string[] }) => {
    const studioAccessToken = setup.getStudioAccessToken()
    if (
      !(
        getConfigValue(ConfigKey.DO_NOT_RECOMMEND_ADD_STUDIO_TOKEN) ||
        studioAccessToken
      )
    ) {
      void promptToAddStudioToken()
    }

    return Toast.showProgress('exp push', async progress => {
      const repository = experiments.getRepository(dvcRoot)

      const updateOnCompletion = () => {
        return repository.unsetPushing(ids)
      }

      progress.report({ increment: 0 })

      progress.report({ increment: 25, message: `Pushing ${ids.join(' ')}...` })

      const remainingProgress = 75

      repository.setPushing(ids)

      try {
        const stdout = await internalCommands.executeCommand(
          AvailableCommands.EXP_PUSH,
          dvcRoot,
          ...ids
        )

        void updateOnCompletion()

        progress.report({
          increment: remainingProgress,
          message: convertUrlTextToLink(stdout)
        })

        return Toast.delayProgressClosing(15000)
      } catch (error: unknown) {
        void updateOnCompletion()
        throw error
      }
    })
  }
